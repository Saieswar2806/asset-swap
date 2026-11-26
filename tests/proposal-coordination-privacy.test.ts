import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db, runInTransaction } from "../src/server/db.js";

describe("Formal Swap Proposal Lifecycle, Privacy & Admin Coordination", () => {
  let adminToken: string;
  let owner1Token: string;
  let owner2Token: string;
  let owner3Token: string;
  let brokerToken: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    adminToken = adminRes.body.token || adminRes.body.data?.token;

    // 2. Authenticate Owner 1 (Naveen Hegde - OWNER-001)
    const o1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    owner1Token = o1Res.body.token || o1Res.body.data?.token;

    // 3. Authenticate Owner 2 (Sunil Kulkarni - OWNER-002)
    const o2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "sunil.kulkarni@owner.local", password: "Owner@123" });
    owner2Token = o2Res.body.token || o2Res.body.data?.token;

    // 4. Authenticate Owner 3 (Arun Deshmukh - OWNER-007)
    const o3Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "arun.deshmukh@owner.local", password: "Owner@123" });
    owner3Token = o3Res.body.token || o3Res.body.data?.token;

    // 5. Authenticate Broker
    const brokerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });
    brokerToken = brokerRes.body.token || brokerRes.body.data?.token;
  });

  afterAll(() => {
    // Teardown any test proposals or coordination records created during tests
    try {
      db.exec(`
        DELETE FROM coordination_timeline WHERE matchId LIKE 'test-%';
        DELETE FROM exchange_coordinations WHERE matchId LIKE 'test-%';
        DELETE FROM notifications WHERE entityId LIKE 'test-%';
        DELETE FROM match_responses WHERE matchId LIKE 'test-%';
        DELETE FROM match_participants WHERE matchId LIKE 'test-%';
        DELETE FROM matches WHERE id LIKE 'test-%';
        UPDATE listings SET locked = 0 WHERE id IN ('ASSET-001', 'ASSET-002', 'ASSET-007', 'ASSET-008', 'ASSET-009');
      `);
    } catch {
      // non-fatal
    }
  });

  describe("A. Owner Privacy Enforcement", () => {
    it("Owner APIs do not expose other owners' email or phone numbers in proposals", async () => {
      // Fetch proposals as Owner 1
      const res = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      for (const proposal of res.body.data) {
        for (const p of proposal.participants) {
          if (!p.isCurrentUser) {
            // Must NOT leak private contact details
            expect(p.ownerEmail).toBeUndefined();
            expect(p.ownerPhone).toBeUndefined();
            expect(p.phone).toBeUndefined();
            expect(p.email).toBeUndefined();
            if (p.ownedProperty) {
              expect(p.ownedProperty.ownerEmail).toBeUndefined();
              expect(p.ownedProperty.ownerPhone).toBeUndefined();
            }
          }
        }
      }
    });

    it("Owner activity endpoint does not expose emails or phone numbers in details", async () => {
      const res = await request(app)
        .get("/api/activity")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      for (const log of res.body.data) {
        if (log.details) {
          expect(log.details).not.toMatch(/"email"\s*:\s*"[^"]+"/);
          expect(log.details).not.toMatch(/"phone"\s*:\s*"[^"]+"/);
        }
      }
    });

    it("Admin exchange endpoint provides owner contact details exclusively to authorized staff", async () => {
      // As Admin: can access staff coordination data
      const adminRes = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);

      // As Owner: forbidden from admin exchanges
      const ownerRes = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(ownerRes.status).toBe(403);
    });
  });

  describe("B. Independent Acceptance & Unanimous Consent Workflow", () => {
    const testMatchId = "test-match-2p-workflow";

    beforeAll(() => {
      // Set up a clean test 2-party match proposal
      const now = new Date().toISOString();
      runInTransaction(() => {
        db.prepare(`
          INSERT OR REPLACE INTO matches (
            id, matchType, partyCount, cycle, listingIds, totalAbsoluteBoot,
            locationScoreKm, matchScore, verificationStatus, status, explanation,
            reasons, exchangeLegs, createdAt, updatedAt
          ) VALUES (?, 'direct', 2, ?, ?, 0, 10, 95, 'reviewed', 'proposed', 'Direct Bilateral Swap Test', '[]', '[]', ?, ?)
        `).run(
          testMatchId,
          JSON.stringify(["ASSET-001", "ASSET-002"]),
          JSON.stringify(["ASSET-001", "ASSET-002"]),
          now,
          now
        );

        db.prepare(`
          INSERT OR REPLACE INTO match_participants (
            id, matchId, listingId, ownerId, ownerName, givesAssetId, givesPropertyType,
            givesValue, receivesAssetId, receivesPropertyType, receivesValue, amount,
            action, cashDifference, explanation
          ) VALUES 
          (?, ?, 'ASSET-001', 'OWNER-001', 'Naveen Hegde', 'ASSET-001', 'apartment', 15000000, 'ASSET-002', 'apartment', 15000000, 0, 'none', 0, 'Direct swap'),
          (?, ?, 'ASSET-002', 'OWNER-002', 'Sunil Kulkarni', 'ASSET-002', 'apartment', 15000000, 'ASSET-001', 'apartment', 15000000, 0, 'none', 0, 'Direct swap')
        `).run(`${testMatchId}-p1`, testMatchId, `${testMatchId}-p2`, testMatchId);

        db.prepare(`
          INSERT OR REPLACE INTO match_responses (id, matchId, listingId, ownerId, decision, respondedAt)
          VALUES 
          (?, ?, 'ASSET-001', 'OWNER-001', 'pending', NULL),
          (?, ?, 'ASSET-002', 'OWNER-002', 'pending', NULL)
        `).run(`${testMatchId}-r1`, testMatchId, `${testMatchId}-r2`, testMatchId);

        db.prepare("UPDATE listings SET locked = 1 WHERE id IN ('ASSET-001', 'ASSET-002')").run();
      });
    });

    it("Rejects response when caller does not own the listing (unauthorized vote rejection)", async () => {
      // Owner 2 attempts to vote for Owner 1's listing ASSET-001
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner2Token}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-001",
          decision: "accepted"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Only the property owner can accept or decline");
    });

    it("Rejects response when admin attempts to impersonate an owner in owner workflow", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-001",
          decision: "accepted"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Rejects response when broker attempts to vote on a proposal", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-001",
          decision: "accepted"
        });

      expect(res.status).toBe(403);
    });

    it("Allows Owner 1 to independently accept; proposal remains proposed and NOT prematurely accepted", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-001",
          decision: "accepted"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchStatus).toBe("proposed"); // Crucial: NOT accepted yet!

      // Check database persistence
      const respRow = db.prepare("SELECT decision FROM match_responses WHERE matchId = ? AND listingId = 'ASSET-001'").get(testMatchId) as any;
      expect(respRow.decision).toBe("accepted");

      const matchRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(testMatchId) as any;
      expect(matchRow.status).toBe("proposed");
    });

    it("Rejects duplicate responses from the same owner", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-001",
          decision: "accepted"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("already recorded");
    });

    it("Property reflects proposal status and user response", async () => {
      const res = await request(app)
        .get("/api/owner/listings")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      const asset1 = res.body.data.find((l: any) => l.id === "ASSET-001");
      expect(asset1).toBeDefined();
      expect(asset1.activeProposal).toBeDefined();
      expect(asset1.activeProposal.myDecision).toBe("accepted");
      expect(asset1.activeProposal.statusLabel).toContain("Accepted");
    });

    it("Owner 2 independently accepts; achieving unanimous consent and creating coordination record", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner2Token}`)
        .send({
          matchId: testMatchId,
          listingId: "ASSET-002",
          decision: "accepted"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchStatus).toBe("accepted");

      // Verify proposal status in DB
      const matchRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(testMatchId) as any;
      expect(matchRow.status).toBe("accepted");

      // Verify coordination entry was automatically created
      const coordRow = db.prepare("SELECT * FROM exchange_coordinations WHERE matchId = ?").get(testMatchId) as any;
      expect(coordRow).toBeDefined();
      expect(coordRow.status).toBe("awaiting_coordination");

      // Verify notification created for Admin
      const notifRow = db.prepare("SELECT * FROM notifications WHERE role = 'admin' AND entityId = ?").get(testMatchId) as any;
      expect(notifRow).toBeDefined();
      expect(notifRow.type).toBe("exchange_accepted");
    });
  });

  describe("C. Admin Coordination Actions & Site Visit Scheduling", () => {
    const testMatchId = "test-match-2p-workflow";

    it("Unanimously accepted proposal appears in Admin coordination queue", async () => {
      const res = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const target = res.body.data.find((e: any) => e.id === testMatchId);
      expect(target).toBeDefined();
      expect(target.coordinationStatus).toBe("awaiting_coordination");
    });

    it("Admin can update exchange coordination status", async () => {
      const res = await request(app)
        .patch(`/api/admin/exchanges/${testMatchId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "coordination_in_progress",
          notes: "Initial phone check with both owners completed."
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const coordRow = db.prepare("SELECT status FROM exchange_coordinations WHERE matchId = ?").get(testMatchId) as any;
      expect(coordRow.status).toBe("coordination_in_progress");

      // Verify audit log
      const audit = db.prepare("SELECT * FROM audit_logs WHERE entityId = ? AND action = 'admin_update_coordination_status'").get(testMatchId) as any;
      expect(audit).toBeDefined();
    });

    it("Admin can schedule a site visit and record notes", async () => {
      const visitDate = "2026-12-05T10:00";
      const res = await request(app)
        .post(`/api/admin/exchanges/${testMatchId}/site-visit`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          siteVisitDate: visitDate,
          siteVisitLocation: "ASSET-001 Site, Koramangala 4th Block",
          siteVisitNotes: "Check boundary fencing and encumbrance certificate."
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const coordRow = db.prepare("SELECT * FROM exchange_coordinations WHERE matchId = ?").get(testMatchId) as any;
      expect(coordRow.status).toBe("site_visit_scheduled");
      expect(coordRow.siteVisitDate).toBe(visitDate);
      expect(coordRow.siteVisitLocation).toContain("Koramangala");

      // Timeline log
      const timeline = db.prepare("SELECT * FROM coordination_timeline WHERE matchId = ? AND action = 'site_visit_scheduled'").get(testMatchId) as any;
      expect(timeline).toBeDefined();
    });

    it("Owner can view scheduled site visit in exchange progress", async () => {
      const res = await request(app)
        .get("/api/owner/exchanges")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const target = res.body.data.find((e: any) => e.id === testMatchId);
      expect(target).toBeDefined();
      expect(target.coordinationStatus).toBe("site_visit_scheduled");
      expect(target.siteVisitDate).toBe("2026-12-05T10:00");
    });
  });

  describe("D. Proposal Rejection Workflow", () => {
    const rejectMatchId = "test-match-reject-workflow";

    beforeAll(() => {
      const now = new Date().toISOString();
      runInTransaction(() => {
        db.prepare(`
          INSERT OR REPLACE INTO matches (
            id, matchType, partyCount, cycle, listingIds, totalAbsoluteBoot,
            locationScoreKm, matchScore, verificationStatus, status, explanation,
            reasons, exchangeLegs, createdAt, updatedAt
          ) VALUES (?, 'direct', 2, ?, ?, 0, 15, 90, 'reviewed', 'proposed', 'Rejection Test Proposal', '[]', '[]', ?, ?)
        `).run(
          rejectMatchId,
          JSON.stringify(["ASSET-001", "ASSET-002"]),
          JSON.stringify(["ASSET-001", "ASSET-002"]),
          now,
          now
        );

        db.prepare(`
          INSERT OR REPLACE INTO match_participants (
            id, matchId, listingId, ownerId, ownerName, givesAssetId, givesPropertyType,
            givesValue, receivesAssetId, receivesPropertyType, receivesValue, amount,
            action, cashDifference, explanation
          ) VALUES 
          (?, ?, 'ASSET-001', 'OWNER-001', 'Naveen Hegde', 'ASSET-001', 'apartment', 15000000, 'ASSET-002', 'apartment', 15000000, 0, 'none', 0, 'Rejection test'),
          (?, ?, 'ASSET-002', 'OWNER-002', 'Sunil Kulkarni', 'ASSET-002', 'apartment', 15000000, 'ASSET-001', 'apartment', 15000000, 0, 'none', 0, 'Rejection test')
        `).run(`${rejectMatchId}-p1`, rejectMatchId, `${rejectMatchId}-p2`, rejectMatchId);

        db.prepare(`
          INSERT OR REPLACE INTO match_responses (id, matchId, listingId, ownerId, decision, respondedAt)
          VALUES 
          (?, ?, 'ASSET-001', 'OWNER-001', 'pending', NULL),
          (?, ?, 'ASSET-002', 'OWNER-002', 'pending', NULL)
        `).run(`${rejectMatchId}-r1`, rejectMatchId, `${rejectMatchId}-r2`, rejectMatchId);

        db.prepare("UPDATE listings SET locked = 1 WHERE id IN ('ASSET-001', 'ASSET-002')").run();
      });
    });

    it("When participant declines, proposal status becomes declined and listings are unlocked immediately", async () => {
      const res = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({
          matchId: rejectMatchId,
          listingId: "ASSET-001",
          decision: "declined"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchStatus).toBe("declined");

      // Verify listings are unlocked
      const l1 = db.prepare("SELECT locked FROM listings WHERE id = 'ASSET-001'").get() as any;
      const l2 = db.prepare("SELECT locked FROM listings WHERE id = 'ASSET-002'").get() as any;
      expect(l1.locked).toBe(0);
      expect(l2.locked).toBe(0);

      // Verify proposal is declined in DB
      const matchRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(rejectMatchId) as any;
      expect(matchRow.status).toBe("declined");
    });
  });
});
