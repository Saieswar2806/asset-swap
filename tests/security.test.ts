import { describe, expect, it, beforeAll, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Asset Swap API Security Hardening & RBAC Audit Tests", () => {
  let adminToken = "";
  let brokerToken = "";
  let ownerAToken = "";
  let ownerBToken = "";

  async function getOwnerTokenForListing(listingId: string): Promise<string> {
    const l = db.prepare("SELECT ownerId FROM listings WHERE id = ?").get(listingId) as { ownerId: string };
    const u = db.prepare("SELECT email FROM users WHERE id = ?").get(l.ownerId) as { email: string };
    const res = await request(app).post("/api/auth/login").send({ email: u.email, password: "Owner@123" });
    return res.body.token;
  }

  const ownerAId = "OWNER-001"; // Naveen Hegde
  const ownerBId = "OWNER-002"; // Sunil Kulkarni

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    adminToken = adminRes.body.token;

    // Broker login
    const brokerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });
    brokerToken = brokerRes.body.token;

    // Owner A login (Naveen Hegde)
    const ownerARes = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    ownerAToken = ownerARes.body.token;

    // Owner B login (Sunil Kulkarni)
    const ownerBRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sunil.kulkarni@owner.local", password: "Owner@123" });
    ownerBToken = ownerBRes.body.token;
  });

  afterEach(() => {
    // Reset any locked listings to prevent cross-test contamination
    try {
      db.prepare("UPDATE listings SET locked = 0 WHERE locked = 1").run();
      db.prepare("UPDATE matches SET status = 'declined' WHERE status = 'proposed'").run();
    } catch {
      // Ignored
    }
  });

  // ==========================================
  // 1. User Information Exposure
  // ==========================================
  describe("1. User Information Exposure & Password Hash Protection", () => {
    it("GET /api/users rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/users rejects non-admin users (Broker and Owner) with 403", async () => {
      const brokerRes = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${brokerToken}`);
      expect(brokerRes.status).toBe(403);

      const ownerRes = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${ownerAToken}`);
      expect(ownerRes.status).toBe(403);
    });

    it("GET /api/users allows Admin and strictly never exposes passwordHash", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify that NO user record contains passwordHash or password
      for (const u of res.body.data) {
        expect(u.passwordHash).toBeUndefined();
        expect(u.password).toBeUndefined();
      }
    });

    it("GET /api/auth/me and PUT /api/auth/profile never return passwordHash", async () => {
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${ownerAToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.passwordHash).toBeUndefined();

      const profileRes = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ agency: "Updated Realty Agency" });
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.user.passwordHash).toBeUndefined();
    });
  });

  // ==========================================
  // 2. Admin Review Routes & Identity Spoofing Protection
  // ==========================================
  describe("2. Admin Review Routes & Identity Spoofing Protection", () => {
    it("GET /api/admin/listings requires admin role", async () => {
      const unauth = await request(app).get("/api/admin/listings");
      expect(unauth.status).toBe(401);

      const owner = await request(app)
        .get("/api/admin/listings")
        .set("Authorization", `Bearer ${ownerAToken}`);
      expect(owner.status).toBe(403);

      const admin = await request(app)
        .get("/api/admin/listings")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(admin.status).toBe(200);
      expect(admin.body.success).toBe(true);
    });

    it("POST /api/admin/listings/:id/review requires admin role", async () => {
      const unauth = await request(app).post("/api/admin/listings/KA-BLR-001/review").send({ action: "approve", reviewedValue: 10000000 });
      expect(unauth.status).toBe(401);

      const broker = await request(app)
        .post("/api/admin/listings/KA-BLR-001/review")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ action: "approve", reviewedValue: 10000000 });
      expect(broker.status).toBe(403);
    });

    it("Admin review derives reviewer identity strictly from session, ignoring spoofed client reviewerId", async () => {
      // Create a test listing
      const subRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Audit Review Target Property",
          propertyType: "apartment",
          district: "Bengaluru",
          locality: "Malleshwaram",
          area: 1200,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 12500000,
          wants: { propertyTypes: ["plot_site"] }
        });
      const listingId = subRes.body.data.id;

      // Admin reviews with spoofed reviewerId in body
      const revRes = await request(app)
        .post(`/api/admin/listings/${listingId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          action: "approve",
          reviewedValue: 12000000,
          reviewerId: "ATTACKER_SPOOFED_ID",
          reviewerName: "Malicious Reviewer"
        });
      expect(revRes.status).toBe(200);

      // Verify DB record used authenticated admin identity
      const reviewRow = db.prepare("SELECT * FROM property_reviews WHERE listingId = ?").get(listingId) as any;
      expect(reviewRow).toBeDefined();
      expect(reviewRow.reviewerId).toBe("admin-001");
      expect(reviewRow.reviewerName).toBe("Kavitha Murthy (Administrator)");
      expect(reviewRow.reviewerId).not.toBe("ATTACKER_SPOOFED_ID");
    });
  });

  // ==========================================
  // 3. Property Creation and Modification Authorization
  // ==========================================
  describe("3. Property Creation and Modification Authorization", () => {
    it("POST /api/listings rejects unauthenticated or broker users", async () => {
      const unauth = await request(app).post("/api/listings").send({ title: "Test" });
      expect(unauth.status).toBe(401);

      const broker = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ title: "Test" });
      expect(broker.status).toBe(403);
    });

    it("POST /api/listings derives ownerId strictly from authenticated user, ignoring client ownerId", async () => {
      const res = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Owner A's Honest Property",
          propertyType: "plot_site",
          district: "Mysuru",
          locality: "Vijayanagar",
          area: 2400,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 8000000,
          ownerId: "SPOOFED_VICTIM_ID",
          ownerName: "Spoofed Victim",
          wants: { propertyTypes: ["farmhouse"] }
        });
      expect(res.status).toBe(201);
      expect(res.body.data.ownerId).toBe(ownerAId);
      expect(res.body.data.ownerName).toBe("Naveen Hegde");
      expect(res.body.data.ownerId).not.toBe("SPOOFED_VICTIM_ID");
    });

    it("PUT /api/listings/:id forbids Owner B from editing Owner A's listing", async () => {
      // Owner A creates property
      const createRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Owner A Protected Land",
          propertyType: "agricultural_land",
          district: "Mandya",
          locality: "Maddur",
          area: 2,
          areaUnit: "acres",
          ownerDeclaredValue: 14000000,
          wants: { propertyTypes: ["commercial"] }
        });
      const listingId = createRes.body.data.id;

      // Owner B attempts to edit Owner A's listing -> 403 Forbidden
      const editRes = await request(app)
        .put(`/api/listings/${listingId}`)
        .set("Authorization", `Bearer ${ownerBToken}`)
        .send({ title: "Hacked by Owner B" });
      expect(editRes.status).toBe(403);
      expect(editRes.body.success).toBe(false);

      // Verify title was not changed in DB
      const dbListing = db.prepare("SELECT title FROM listings WHERE id = ?").get(listingId) as { title: string };
      expect(dbListing.title).toBe("Owner A Protected Land");
    });

    it("PUT /api/listings/:id ignores attempts to tamper with protected fields (reviewedValue, status, locked)", async () => {
      // Owner A creates property
      const createRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Tamper Test Property",
          propertyType: "apartment",
          district: "Bengaluru",
          locality: "Hebbal",
          area: 1500,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 9500000,
          wants: { propertyTypes: ["plot_site"] }
        });
      const listingId = createRes.body.data.id;

      // Owner A attempts to elevate status and reviewedValue
      const editRes = await request(app)
        .put(`/api/listings/${listingId}`)
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Updated Title",
          reviewedValue: 999999999,
          status: "reviewed",
          locked: 1,
          ownerId: "someone_else"
        });
      expect(editRes.status).toBe(200);

      // Verify protected fields were NOT modified
      const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(listingId) as any;
      expect(row.title).toBe("Updated Title");
      expect(row.reviewedValue).toBeNull();
      expect(row.status).toBe("submitted");
      expect(row.locked).toBe(0);
      expect(row.ownerId).toBe(ownerAId);
    });

    it("PUT /api/listings/:id rejects editing when property is locked in escrow", async () => {
      // Create listing and lock it
      const createRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({
          title: "Escrow Locked Property",
          propertyType: "independent_house",
          district: "Bengaluru",
          locality: "Jayanagar",
          area: 2000,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 25000000,
          wants: { propertyTypes: ["commercial"] }
        });
      const listingId = createRes.body.data.id;
      db.prepare("UPDATE listings SET locked = 1 WHERE id = ?").run(listingId);

      // Attempt to edit while locked
      const editRes = await request(app)
        .put(`/api/listings/${listingId}`)
        .set("Authorization", `Bearer ${ownerAToken}`)
        .send({ title: "Edit while locked" });
      expect(editRes.status).toBe(400);
      expect(editRes.body.error).toContain("locked");
    });
  });

  // ==========================================
  // 4. Swap Proposal Authorization & Escrow
  // ==========================================
  describe("4. Swap Proposal Authorization & Escrow Locks", () => {
    it("POST /api/workflow/propose rejects unauthenticated or broker users", async () => {
      const unauth = await request(app).post("/api/workflow/propose").send({ matchId: "some-match" });
      expect(unauth.status).toBe(401);

      const broker = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ matchId: "some-match" });
      expect(broker.status).toBe(403);
    });

    it("POST /api/workflow/propose forbids an owner from proposing a match they do not participate in", async () => {
      // Find a 2-party match
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      // Find an owner who does NOT participate in this match
      const participantOwnerIds = match.boots.map((b: { ownerId: string }) => b.ownerId);
      const nonParticipantOwner = [ownerAId, ownerBId, "OWNER-007"].find((id) => !participantOwnerIds.includes(id));

      if (nonParticipantOwner) {
        // Log in as that non-participant owner
        const nonPartUser = db.prepare("SELECT email FROM users WHERE id = ?").get(nonParticipantOwner) as { email: string };
        const nonPartLogin = await request(app).post("/api/auth/login").send({ email: nonPartUser.email, password: "Owner@123" });
        const nonPartToken = nonPartLogin.body.token;

        const res = await request(app)
          .post("/api/workflow/propose")
          .set("Authorization", `Bearer ${nonPartToken}`)
          .send({ matchId: match.id });
        expect(res.status).toBe(403);
        expect(res.body.error).toContain("Forbidden");
      }
    });

    it("POST /api/workflow/propose rejects duplicate proposal if one property is already locked in escrow", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      // First propose succeeds
      const prop1 = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: match.id });
      expect(prop1.status).toBe(200);

      // Second propose on the same match or containing locked listing fails
      const prop2 = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: match.id });
      expect(prop2.status).toBe(400);
    });
  });

  // ==========================================
  // 5. Participant Voting Authorization & Escrow Lifecycle
  // ==========================================
  describe("5. Participant Voting Authorization & Escrow Lifecycle", () => {
    it("POST /api/workflow/respond forbids an owner from voting on another owner's property", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      // Propose match
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: match.id });

      // Identify owner of listing 0 vs listing 1
      const listing0 = db.prepare("SELECT ownerId FROM listings WHERE id = ?").get(match.listingIds[0]) as { ownerId: string };
      const listing1 = db.prepare("SELECT ownerId FROM listings WHERE id = ?").get(match.listingIds[1]) as { ownerId: string };

      // Ensure we have tokens for both
      const owner0User = db.prepare("SELECT email FROM users WHERE id = ?").get(listing0.ownerId) as { email: string };
      const owner1User = db.prepare("SELECT email FROM users WHERE id = ?").get(listing1.ownerId) as { email: string };

      const login0 = await request(app).post("/api/auth/login").send({ email: owner0User.email, password: "Owner@123" });
      const login1 = await request(app).post("/api/auth/login").send({ email: owner1User.email, password: "Owner@123" });

      // Owner 0 tries to vote on listing 1 -> 403 Forbidden
      const unauthorizedVote = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${login0.body.token}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[1],
          decision: "accepted"
        });
      expect(unauthorizedVote.status).toBe(403);
      expect(unauthorizedVote.body.error).toContain("Forbidden");
    });

    it("POST /api/workflow/respond forbids an Admin from substituting for an owner's consent", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: match.id });

      // Admin attempts to vote on owner's property -> 403 Forbidden
      const adminVote = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(adminVote.status).toBe(403);
      expect(adminVote.body.error).toContain("Only the property owner can accept or decline");
    });

    it("POST /api/workflow/respond rejects duplicate votes from the same participant", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
      expect(match).toBeDefined();

      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: match.id });

      const token0 = await getOwnerTokenForListing(match.listingIds[0]);

      // First vote succeeds
      const vote1 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${token0}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(vote1.status).toBe(200);

      // Duplicate vote fails
      const vote2 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${token0}`)
        .send({
          matchId: match.id,
          listingId: match.listingIds[0],
          decision: "accepted"
        });
      expect(vote2.status).toBe(400);
      expect(vote2.body.error).toContain("already recorded");
    });

    it("Unanimous vote required for 3-party swap to transition to accepted", async () => {
      const matchesRes = await request(app).get("/api/matches");
      const threePartyMatch = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 3);
      expect(threePartyMatch).toBeDefined();

      // Propose 3-party match
      await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ matchId: threePartyMatch.id });

      const token0 = await getOwnerTokenForListing(threePartyMatch.listingIds[0]);
      const token1 = await getOwnerTokenForListing(threePartyMatch.listingIds[1]);
      const token2 = await getOwnerTokenForListing(threePartyMatch.listingIds[2]);

      // Participant 1 accepts -> stays proposed
      const resp1 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${token0}`)
        .send({
          matchId: threePartyMatch.id,
          listingId: threePartyMatch.listingIds[0],
          decision: "accepted"
        });
      expect(resp1.body.matchStatus).toBe("proposed");

      // Participant 2 accepts -> stays proposed
      const resp2 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          matchId: threePartyMatch.id,
          listingId: threePartyMatch.listingIds[1],
          decision: "accepted"
        });
      expect(resp2.body.matchStatus).toBe("proposed");

      // Participant 3 accepts -> becomes accepted!
      const resp3 = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          matchId: threePartyMatch.id,
          listingId: threePartyMatch.listingIds[2],
          decision: "accepted"
        });
      expect(resp3.body.matchStatus).toBe("accepted");
    });
  });

  // ==========================================
  // 6. Proposal & Audit Data Privacy Isolation
  // ==========================================
  describe("6. Proposal & Audit Data Privacy Isolation", () => {
    it("GET /api/proposals rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/proposals");
      expect(res.status).toBe(401);
    });

    it("GET /api/proposals returns empty array for Brokers", async () => {
      const res = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${brokerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("GET /api/proposals restricts Owners strictly to their own participating proposals", async () => {
      // Create and propose a match involving Owner A
      const matchesRes = await request(app).get("/api/matches");
      const matchWithA = matchesRes.body.data.find((m: any) =>
        m.boots.some((b: any) => b.ownerId === ownerAId)
      );

      if (matchWithA) {
        await request(app)
          .post("/api/workflow/propose")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ matchId: matchWithA.id });
      }

      // Owner A requests proposals
      const ownerARes = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${ownerAToken}`);
      expect(ownerARes.status).toBe(200);

      // Verify EVERY returned proposal contains Owner A
      for (const p of ownerARes.body.data) {
        const containsOwnerA =
          p.participants.some((part: any) => part.ownerId === ownerAId) ||
          p.listingIds.some((lid: string) => {
            const l = db.prepare("SELECT ownerId FROM listings WHERE id = ?").get(lid) as any;
            return l?.ownerId === ownerAId;
          });
        expect(containsOwnerA).toBe(true);
      }
    });

    it("GET /api/activity rejects unauthenticated requests and sanitizes limit", async () => {
      const unauth = await request(app).get("/api/activity");
      expect(unauth.status).toBe(401);

      // Admin requests with huge limit -> clamped to 100 max
      const adminRes = await request(app)
        .get("/api/activity?limit=999999")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBeLessThanOrEqual(100);
    });

    it("GET /api/activity isolates Owner audit logs from global activities", async () => {
      const ownerRes = await request(app)
        .get("/api/activity")
        .set("Authorization", `Bearer ${ownerAToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.success).toBe(true);

      // No log in owner's activity should belong to unrelated admin tasks or other users' confidential reviews
      for (const log of ownerRes.body.data) {
        // Either performedBy is this owner, or entity is this owner's listing/proposal
        const isOwn =
          log.performedBy === "Naveen Hegde" ||
          log.performedBy === ownerAId ||
          db.prepare("SELECT 1 FROM listings WHERE id = ? AND ownerId = ?").get(log.entityId, ownerAId) !== undefined ||
          db.prepare("SELECT 1 FROM match_participants WHERE matchId = ? AND ownerId = ?").get(log.entityId, ownerAId) !== undefined;
        expect(isOwn).toBe(true);
      }
    });
  });
});
