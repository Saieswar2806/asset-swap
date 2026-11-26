import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../src/server/index.js";
import { db, ensureDemoAcceptedExchanges } from "../src/server/db.js";

describe("Logo Redesign, Duplicate Proposals Removal, Demo Accepted Exchanges & Persistent Coordination", () => {
  let adminToken = "";
  let brokerToken = "";
  let ownerToken = "";

  const demoIds = [
    "match-demo-accepted-residential-01",
    "match-demo-accepted-commercial-02",
    "match-demo-accepted-land-03"
  ];

  // Snapshot original coordination state of demo-01 so tests don't permanently dirty demo data
  let savedCoordRes01: any = null;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    const brokerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });
    expect(brokerRes.status).toBe(200);
    brokerToken = brokerRes.body.token;

    const ownerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "deepanarayan@owner.local", password: "Owner@123" })
      .catch(() => null);

    if (ownerRes && ownerRes.status === 200) {
      ownerToken = ownerRes.body.token;
    } else {
      const fallbackOwner = await request(app)
        .post("/api/auth/login")
        .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
      ownerToken = fallbackOwner.body.token;
    }

    savedCoordRes01 = db
      .prepare("SELECT * FROM exchange_coordinations WHERE matchId = ?")
      .get("match-demo-accepted-residential-01");
  });

  afterAll(() => {
    if (savedCoordRes01) {
      db.prepare(`
        UPDATE exchange_coordinations
        SET status = ?, coordinationStage = ?, nextAction = ?, contactInitiated = ?,
            contactedOwners = ?, lastFollowUpAt = ?, followUpSummary = ?,
            siteVisitDate = ?, siteVisitLocation = ?, siteVisitNotes = ?,
            coordinationNotes = ?, updatedAt = ?
        WHERE matchId = 'match-demo-accepted-residential-01'
      `).run(
        savedCoordRes01.status,
        savedCoordRes01.coordinationStage,
        savedCoordRes01.nextAction,
        savedCoordRes01.contactInitiated,
        savedCoordRes01.contactedOwners,
        savedCoordRes01.lastFollowUpAt,
        savedCoordRes01.followUpSummary,
        savedCoordRes01.siteVisitDate,
        savedCoordRes01.siteVisitLocation,
        savedCoordRes01.siteVisitNotes,
        savedCoordRes01.coordinationNotes,
        savedCoordRes01.updatedAt
      );
      db.prepare(`
        DELETE FROM coordination_timeline
        WHERE matchId = 'match-demo-accepted-residential-01' AND id != 'time-match-demo-accepted-residential-01-consensus'
      `).run();
    }
  });

  describe("1. UI Structural & Branding Verification", () => {
    it("Duplicate ProposalsPage is removed and Owner navigation points Swap requests to Swap Hub", () => {
      const proposalsPagePath = path.resolve(process.cwd(), "src/client/pages/ProposalsPage.tsx");
      expect(fs.existsSync(proposalsPagePath)).toBe(false);

      const ownerLayoutSrc = fs.readFileSync(path.resolve(process.cwd(), "src/client/components/OwnerLayout.tsx"), "utf8");
      expect(ownerLayoutSrc).not.toContain('label: "Swap Proposals"');
      expect(ownerLayoutSrc).toContain('path: "/swap"');

      const navbarSrc = fs.readFileSync(path.resolve(process.cwd(), "src/client/components/Navbar.tsx"), "utf8");
      expect(navbarSrc).not.toContain('label: "Swap Proposals"');

      const appSrc = fs.readFileSync(path.resolve(process.cwd(), "src/client/App.tsx"), "utf8");
      expect(appSrc).toContain('path="/proposals"');
      expect(appSrc).toContain('<Navigate to="/swap');
    });

    it("New SVG AssetSwapLogo component exists and is integrated consistently across layouts & auth views", () => {
      const logoSrc = fs.readFileSync(path.resolve(process.cwd(), "src/client/components/AssetSwapLogo.tsx"), "utf8");
      expect(logoSrc).toContain("<svg");
      expect(logoSrc).toContain("Asset");
      expect(logoSrc).toContain("Swap");

      const checkedFiles = [
        "src/client/components/OwnerLayout.tsx",
        "src/client/components/DashboardLayout.tsx",
        "src/client/components/Navbar.tsx",
        "src/client/components/Footer.tsx",
        "src/client/pages/LoginPage.tsx",
        "src/client/pages/OwnerRegisterPage.tsx",
        "src/client/pages/BrokerApplyPage.tsx"
      ];

      for (const rel of checkedFiles) {
        const src = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
        expect(src).toContain("AssetSwapLogo");
      }
    });
  });

  describe("2. Demo Accepted Exchanges Seeding, Unanimity & Idempotency", () => {
    it("Seeds 3 realistic demo accepted exchanges (residential, commercial, 3-party land) with unanimous owner consent", async () => {
      const res = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      for (const id of demoIds) {
        const ex = res.body.data.find((e: any) => e.id === id);
        expect(ex).toBeDefined();
        expect(ex.status).toBe("accepted");
        expect(ex.isDemo).toBe(true);
        expect(ex.participants.length).toBeGreaterThanOrEqual(2);
        expect(ex.participants.every((p: any) => p.response === "accepted")).toBe(true);
        expect(ex.participants.every((p: any) => Boolean(p.property?.title && p.property?.locality))).toBe(true);
        expect(ex.nextAction).toBeTruthy();
      }
    });

    it("ensureDemoAcceptedExchanges is completely idempotent and creates zero duplicates on repeated runs", () => {
      const before = (db.prepare("SELECT COUNT(*) as c FROM matches WHERE id IN (?, ?, ?)").get(...demoIds) as { c: number }).c;
      expect(before).toBe(3);

      ensureDemoAcceptedExchanges();
      ensureDemoAcceptedExchanges();

      const after = (db.prepare("SELECT COUNT(*) as c FROM matches WHERE id IN (?, ?, ?)").get(...demoIds) as { c: number }).c;
      expect(after).toBe(3);
    });
  });

  describe("3. Admin Coordination Persistence & RBAC Enforcement", () => {
    const targetId = "match-demo-accepted-residential-01";

    it("Blocks non-admin roles (Owner and Broker) from accessing Admin coordination endpoints", async () => {
      const ownerStatusRes = await request(app)
        .patch(`/api/admin/exchanges/${targetId}/status`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ coordinationStage: "contact_initiated" });
      expect(ownerStatusRes.status).toBe(403);

      const brokerContactRes = await request(app)
        .post(`/api/admin/exchanges/${targetId}/contact-log`)
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ ownerId: "OWNER-003", method: "Phone Call" });
      expect(brokerContactRes.status).toBe(403);
    });

    it("Persists stage, next action, per-owner outreach contact tracking, and history without altering owner consent", async () => {
      const contactRes = await request(app)
        .post(`/api/admin/exchanges/${targetId}/contact-log`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ownerId: "OWNER-003",
          method: "Phone Call",
          contacted: true,
          followUpNote: "Spoke with Deepa Narayan; confirmed availability for Mysuru joint review.",
          nextAction: "Call Raghavendra Rao and confirm Friday afternoon meeting slot."
        });

      expect(contactRes.status).toBe(200);
      expect(contactRes.body.data.contactInitiated).toBe(true);
      expect(contactRes.body.data.coordinationStage).toBe("contact_initiated");

      const stageRes = await request(app)
        .patch(`/api/admin/exchanges/${targetId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          coordinationStage: "legal_documentation_in_progress",
          nextAction: "Verify A-Khata and Form 15 EC with empanelled Mysuru advocate.",
          contactInitiated: true,
          notes: "Both residential documents queued for legal scrutiny."
        });
      expect(stageRes.status).toBe(200);

      // Re-fetch from API to confirm full SQLite persistence
      const refreshed = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);
      const updated = refreshed.body.data.find((e: any) => e.id === targetId);
      expect(updated.coordinationStage).toBe("legal_documentation_in_progress");
      expect(updated.contactInitiated).toBe(true);
      expect(updated.nextAction).toContain("Form 15 EC");
      expect(updated.participants.find((p: any) => p.ownerId === "OWNER-003")?.contacted).toBe(true);
      expect(updated.timeline.length).toBeGreaterThanOrEqual(2);

      // Owner unanimous consent remains untouched
      const responses = db.prepare("SELECT decision FROM match_responses WHERE matchId = ?").all(targetId) as Array<{ decision: string }>;
      expect(responses.length).toBe(2);
      expect(responses.every((r) => r.decision === "accepted")).toBe(true);
    });
  });
});
