import { describe, expect, it, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Asset Swap End-to-End Swap Lifecycle & Owner Experience Tests", () => {
  afterEach(() => {
    // Unlock any locked listings and reset proposed matches so tests stay hermetic
    try {
      db.prepare("UPDATE listings SET locked = 0 WHERE locked = 1").run();
      db.prepare("UPDATE matches SET status = 'declined' WHERE status = 'proposed'").run();
    } catch {
      // Ignored
    }
  });

  async function getOwnerTokenForListing(listingId: string): Promise<{ token: string; ownerId: string; ownerEmail: string }> {
    const listing = db.prepare("SELECT ownerId FROM listings WHERE id = ?").get(listingId) as { ownerId: string };
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(listing.ownerId) as { email: string };
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "Owner@123" });
    return { token: res.body.token, ownerId: listing.ownerId, ownerEmail: user.email };
  }

  // ==========================================
  // Scenario A: Two-Party Direct Exchange Full Consensus
  // ==========================================
  describe("Scenario A: Two-Party Direct Asset Exchange Consensus", () => {
    it("Owner A proposes, Owner A accepts, Owner B logs in independently & accepts -> proposal accepted", async () => {
      // 1. Fetch available matches from matching engine
      const matchesRes = await request(app).get("/api/matches");
      expect(matchesRes.status).toBe(200);
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      const listingIdA = match.listingIds[0];
      const listingIdB = match.listingIds[1];

      // 2. Owner A logs in and proposes the exchange
      const ownerA = await getOwnerTokenForListing(listingIdA);
      const proposeRes = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });
      expect(proposeRes.status).toBe(200);
      expect(proposeRes.body.success).toBe(true);

      // Verify both properties are immediately locked in escrow
      const lA_afterPropose = db.prepare("SELECT locked FROM listings WHERE id = ?").get(listingIdA) as { locked: number };
      const lB_afterPropose = db.prepare("SELECT locked FROM listings WHERE id = ?").get(listingIdB) as { locked: number };
      expect(lA_afterPropose.locked).toBe(1);
      expect(lB_afterPropose.locked).toBe(1);

      // 3. Owner A accepts their participation
      const acceptResA = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({
          matchId: match.id,
          listingId: listingIdA,
          decision: "accepted"
        });
      expect(acceptResA.status).toBe(200);
      expect(acceptResA.body.matchStatus).toBe("proposed"); // Still awaiting Owner B

      // 4. Owner B logs in independently from separate account and accepts
      const ownerB = await getOwnerTokenForListing(listingIdB);
      expect(ownerB.ownerId).not.toBe(ownerA.ownerId);

      const acceptResB = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${ownerB.token}`)
        .send({
          matchId: match.id,
          listingId: listingIdB,
          decision: "accepted"
        });
      expect(acceptResB.status).toBe(200);
      expect(acceptResB.body.matchStatus).toBe("accepted");

      // Verify match in DB is officially accepted and escrow locks retained
      const matchRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(match.id) as { status: string };
      expect(matchRow.status).toBe("accepted");
    });
  });

  // ==========================================
  // Scenario B: Two-Party Direct Exchange Rejection & Unlock
  // ==========================================
  describe("Scenario B: Two-Party Rejection & Automatic Escrow Unlock", () => {
    it("When one participant owner declines, proposal becomes declined and all locks are released", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      const listingIdA = match.listingIds[0];
      const listingIdB = match.listingIds[1];

      const ownerA = await getOwnerTokenForListing(listingIdA);
      const ownerB = await getOwnerTokenForListing(listingIdB);

      // Owner A proposes
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });

      // Owner B declines participation
      const declineRes = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${ownerB.token}`)
        .send({
          matchId: match.id,
          listingId: listingIdB,
          decision: "declined"
        });
      expect(declineRes.status).toBe(200);
      expect(declineRes.body.matchStatus).toBe("declined");

      // Verify in DB that status is declined and BOTH listings are unlocked
      const matchRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(match.id) as { status: string };
      expect(matchRow.status).toBe("declined");

      const lA = db.prepare("SELECT locked FROM listings WHERE id = ?").get(listingIdA) as { locked: number };
      const lB = db.prepare("SELECT locked FROM listings WHERE id = ?").get(listingIdB) as { locked: number };
      expect(lA.locked).toBe(0);
      expect(lB.locked).toBe(0);
    });
  });

  // ==========================================
  // Scenario C: Three-Party Circular Exchange Consensus
  // ==========================================
  describe("Scenario C: Three-Party Circular Trade Loop Independent Voting", () => {
    it("Three different owners log in separately; proposal is accepted strictly when all three accept", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const threePartyMatch = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 3);
      expect(threePartyMatch).toBeDefined();

      const [lid1, lid2, lid3] = threePartyMatch.listingIds;

      const owner1 = await getOwnerTokenForListing(lid1);
      const owner2 = await getOwnerTokenForListing(lid2);
      const owner3 = await getOwnerTokenForListing(lid3);

      // Verify all 3 owners are distinct users
      expect(new Set([owner1.ownerId, owner2.ownerId, owner3.ownerId]).size).toBe(3);

      // Owner 1 proposes
      const propRes = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${owner1.token}`)
        .send({ matchId: threePartyMatch.id });
      expect(propRes.status).toBe(200);

      // Owner 1 accepts
      const resp1 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner1.token}`)
        .send({ matchId: threePartyMatch.id, listingId: lid1, decision: "accepted" });
      expect(resp1.status).toBe(200);
      expect(resp1.body.matchStatus).toBe("proposed");

      // Owner 2 accepts (2 out of 3 accepted) -> still proposed!
      const resp2 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner2.token}`)
        .send({ matchId: threePartyMatch.id, listingId: lid2, decision: "accepted" });
      expect(resp2.status).toBe(200);
      expect(resp2.body.matchStatus).toBe("proposed");

      // Verify DB match record is still 'proposed'
      const checkRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(threePartyMatch.id) as { status: string };
      expect(checkRow.status).toBe("proposed");

      // Owner 3 accepts (3 out of 3 accepted) -> transitions to accepted!
      const resp3 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${owner3.token}`)
        .send({ matchId: threePartyMatch.id, listingId: lid3, decision: "accepted" });
      expect(resp3.status).toBe(200);
      expect(resp3.body.matchStatus).toBe("accepted");

      const finalRow = db.prepare("SELECT status FROM matches WHERE id = ?").get(threePartyMatch.id) as { status: string };
      expect(finalRow.status).toBe("accepted");
    });
  });

  // ==========================================
  // Scenario D: Unauthorized Voting & Strict Role Boundary Protection
  // ==========================================
  describe("Scenario D: Strict Voting Authorization & Duplicate Rejection", () => {
    it("Admin cannot substitute for an owner's consent (returns 403)", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);

      const ownerA = await getOwnerTokenForListing(match.listingIds[0]);
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });

      const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@asset-swap.local", password: "Admin@123" });

      const adminVote = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${adminLogin.body.token}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(adminVote.status).toBe(403);
      expect(adminVote.body.error).toContain("Only the property owner can accept or decline");
    });

    it("Broker cannot submit owner responses (returns 403)", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);

      const ownerA = await getOwnerTokenForListing(match.listingIds[0]);
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });

      const brokerLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });

      const brokerVote = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${brokerLogin.body.token}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(brokerVote.status).toBe(403);
    });

    it("An unrelated owner cannot respond on another owner's property (returns 403)", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);

      const ownerA = await getOwnerTokenForListing(match.listingIds[0]);
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });

      // Unrelated owner login (e.g. OWNER-014 Pooja Varma)
      const unrelatedLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "pooja.varma@owner.local", password: "Owner@123" });

      const unauthorizedVote = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${unrelatedLogin.body.token}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(unauthorizedVote.status).toBe(403);
    });

    it("Duplicate responses by the same owner are rejected with 400", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);

      const ownerA = await getOwnerTokenForListing(match.listingIds[0]);
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id });

      // First vote
      const v1 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id, listingId: match.listingIds[0], decision: "accepted" });
      expect(v1.status).toBe(200);

      // Duplicate vote
      const v2 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${ownerA.token}`)
        .send({ matchId: match.id, listingId: match.listingIds[0], decision: "accepted" });
      expect(v2.status).toBe(400);
      expect(v2.body.error).toContain("already recorded");
    });
  });

  // ==========================================
  // Scenario E: Public API Data Privacy Enforcement
  // ==========================================
  describe("Scenario E: Public API Data Privacy & Discovery Boundary", () => {
    it("Public users cannot retrieve private proposal details (GET /api/proposals returns 401)", async () => {
      const res = await request(app).get("/api/proposals");
      expect(res.status).toBe(401);
    });

    it("Public users cannot retrieve audit activity log (GET /api/activity returns 401)", async () => {
      const res = await request(app).get("/api/activity");
      expect(res.status).toBe(401);
    });

    it("Public directory strictly excludes unreviewed and rejected properties", async () => {
      // 1. Submit a pending unreviewed property
      const ownerLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });

      const createRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerLogin.body.token}`)
        .send({
          title: "Private Unreviewed Test Site",
          propertyType: "plot_site",
          district: "Bengaluru",
          locality: "Kengeri",
          area: 1200,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 5000000,
          wants: { propertyTypes: ["apartment"] }
        });
      const pendingId = createRes.body.data.id;

      // 2. Query public listings endpoint without auth
      const publicListings = await request(app).get("/api/listings");
      expect(publicListings.status).toBe(200);
      const returnedIds = publicListings.body.data.map((l: { id: string }) => l.id);
      expect(returnedIds).not.toContain(pendingId);

      // 3. Attempt to fetch public listings with explicit status=submitted filter -> still excluded!
      const attemptExploit = await request(app).get("/api/listings?status=submitted");
      expect(attemptExploit.status).toBe(200);
      expect(attemptExploit.body.data.every((l: { status: string }) => l.status === "reviewed")).toBe(true);

      // 4. Directly request unreviewed property by ID -> 404 Not Found for public user
      const directPublic = await request(app).get(`/api/listings/${pendingId}`);
      expect(directPublic.status).toBe(404);
    });
  });

  // ==========================================
  // Scenario F: Cash Adjustment Conservation (Cycle Sum = 0)
  // ==========================================
  describe("Scenario F: Mutual Cash Boot Conservation Across Graph Cycles", () => {
    it("Verifies that signed cash adjustments sum strictly to zero for all 2-party and 3-party swaps", async () => {
      const res = await request(app).get("/api/matches");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const match of res.body.data) {
        const netBoot = match.boots.reduce((acc: number, b: { amount: number }) => acc + b.amount, 0);
        expect(Math.abs(netBoot)).toBeLessThanOrEqual(0.01);

        // Every participant with positive amount has action === 'pays'
        // Every participant with negative amount has action === 'receives'
        // Every participant with zero amount has action === 'settled'
        for (const boot of match.boots) {
          if (boot.amount > 0) {
            expect(boot.action).toBe("pays");
            expect(boot.cashDifference).toBeGreaterThan(0);
          } else if (boot.amount < 0) {
            expect(boot.action).toBe("receives");
            expect(boot.cashDifference).toBeGreaterThan(0);
          } else {
            expect(boot.action).toBe("settled");
            expect(boot.cashDifference).toBe(0);
          }
        }
      }
    });
  });
});
