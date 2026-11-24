import { describe, expect, it, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Asset Swap Full-Stack API Integration Tests", () => {
  afterEach(() => {
    // Keep listings unlocked between tests so test ordering does not deplete matching candidates
    try {
      db.prepare("UPDATE listings SET locked = 0 WHERE locked = 1").run();
    } catch {
      // Ignored
    }
  });
  it("GET /health returns healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("GET /api/users returns demonstration users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const admin = res.body.data.find((u: { role: string }) => u.role === "admin");
    expect(admin).toBeDefined();
  });

  it("GET /api/dashboard/stats returns aggregate metrics and charts data", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data;
    expect(stats.totalListings).toBeGreaterThanOrEqual(100);
    expect(stats.brokerReviewed).toBeGreaterThan(0);
    expect(stats.availableMatchesCount).toBeGreaterThan(0);
    expect(stats.typeDistribution.length).toBeGreaterThan(0);
    expect(stats.districtDistribution.length).toBeGreaterThan(0);
  });

  it("GET /api/listings returns filtered property listings", async () => {
    const res = await request(app).get("/api/listings?district=Ramanagara");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every((l: { district: string }) => l.district === "Ramanagara")).toBe(true);
  });

  it("POST /api/listings successfully submits a new property in 'submitted' state", async () => {
    const newProperty = {
      title: "Charming Coffee Estate Land",
      propertyType: "agricultural_land",
      district: "Ramanagara",
      locality: "Kanakapura",
      area: 3.5,
      areaUnit: "acres",
      ownerDeclaredValue: 24000000,
      khataType: "Pahani",
      surveyNumber: "Sy. 142/2",
      conversionStatus: "Agricultural",
      description: "Direct road access with clear boundary stones.",
      wants: {
        propertyTypes: ["farmhouse"],
        preferredLocations: ["Harohalli"],
        minArea: 1,
        minAreaUnit: "acres",
        maxCashToPay: 3000000,
        maxCashToReceive: 3000000
      }
    };

    const res = await request(app).post("/api/listings").send(newProperty);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("submitted");
    expect(res.body.data.reviewedValue).toBeUndefined();
    expect(res.body.data.wants.propertyTypes).toContain("farmhouse");
  });

  it("Admin Review Panel: Rejects invalid approval without reviewedValue, then approves with broker valuation", async () => {
    // 1. First submit a property
    const subRes = await request(app).post("/api/listings").send({
      title: "Pending Commercial Complex",
      propertyType: "commercial",
      district: "Bengaluru",
      locality: "Indiranagar",
      area: 2500,
      areaUnit: "sq_ft",
      ownerDeclaredValue: 35000000,
      wants: { propertyTypes: ["apartment"] }
    });
    const listingId = subRes.body.data.id;

    // 2. Try to approve without positive reviewedValue -> must be rejected
    const adminLogin = await request(app).post("/api/auth/login").send({ email: "admin@asset-swap.local", password: "Admin@123" });
    const adminToken = adminLogin.body.token;

    const invalidApprove = await request(app)
      .post(`/api/admin/listings/${listingId}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        action: "approve",
        reviewedValue: 0
      });
    expect(invalidApprove.status).toBe(400);

    // 3. Approve with manual broker valuation of ₹3.2 Cr
    const validApprove = await request(app)
      .post(`/api/admin/listings/${listingId}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        action: "approve",
        reviewedValue: 32000000,
        internalNotes: "Sub-registrar guidance value verified. Broker physical inspection passed."
      });
    expect(validApprove.status).toBe(200);
    expect(validApprove.body.data.status).toBe("reviewed");
    expect(validApprove.body.data.reviewedValue).toBe(32000000);
  });

  it("GET /api/matches runs graph matching engine and returns 2-party and 3-party exchanges", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.twoPartyCount).toBeGreaterThan(0);
    expect(res.body.threePartyCount).toBeGreaterThan(0);

    const firstMatch = res.body.data[0];
    expect(firstMatch.id).toBeDefined();
    expect(firstMatch.boots).toBeDefined();
    expect(firstMatch.exchangeLegs).toBeDefined();
    expect(firstMatch.matchScore).toBeGreaterThanOrEqual(0);
  });

  it("POST /api/workflow/propose and /respond lifecycle works correctly", async () => {
    // Get matches
    const matchesRes = await request(app).get("/api/matches");
    const match = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
    expect(match).toBeDefined();

    // Propose match -> locks listings
    const proposeRes = await request(app).post("/api/workflow/propose").send({ matchId: match.id });
    expect(proposeRes.status).toBe(200);

    // Participant 1 accepts
    const resp1 = await request(app).post("/api/workflow/respond").send({
      matchId: match.id,
      listingId: match.listingIds[0],
      decision: "accepted"
    });
    expect(resp1.status).toBe(200);
    expect(resp1.body.matchStatus).toBe("proposed");

    // Participant 2 accepts -> becomes accepted
    const resp2 = await request(app).post("/api/workflow/respond").send({
      matchId: match.id,
      listingId: match.listingIds[1],
      decision: "accepted"
    });
    expect(resp2.status).toBe(200);
    expect(resp2.body.matchStatus).toBe("accepted");
  });

  it("Admin Review Panel: Listing rejection records reason and prevents matching", async () => {
    // 1. Submit property
    const subRes = await request(app).post("/api/listings").send({
      title: "Substandard Farmland with Title Issues",
      propertyType: "agricultural_land",
      district: "Mandya",
      locality: "Maddur",
      area: 2,
      areaUnit: "acres",
      ownerDeclaredValue: 15000000,
      wants: { propertyTypes: ["farmhouse"] }
    });
    const listingId = subRes.body.data.id;

    // 2. Reject property
    const adminLogin = await request(app).post("/api/auth/login").send({ email: "admin@asset-swap.local", password: "Admin@123" });
    const adminToken = adminLogin.body.token;

    const rejRes = await request(app)
      .post(`/api/admin/listings/${listingId}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        action: "reject",
        rejectionReason: "Title encumbrance found during preliminary legal verification."
      });
    expect(rejRes.status).toBe(200);
    expect(rejRes.body.data.status).toBe("rejected");
    expect(rejRes.body.data.metadata?.rejectionReason).toContain("Title encumbrance");
  });

  it("Matching engine strictly processes only approved/reviewed listings", async () => {
    // Submit an unreviewed listing
    const subRes = await request(app).post("/api/listings").send({
      title: "Unreviewed Luxury Apartment",
      propertyType: "apartment",
      district: "Bengaluru",
      locality: "Whitefield",
      area: 1800,
      areaUnit: "sq_ft",
      ownerDeclaredValue: 12000000,
      wants: { propertyTypes: ["plot_site"] }
    });
    const unapprovedId = subRes.body.data.id;

    // Get matches
    const matchesRes = await request(app).get("/api/matches");
    const matchingListingIds = matchesRes.body.data.flatMap((m: { listingIds: string[] }) => m.listingIds);
    expect(matchingListingIds).not.toContain(unapprovedId);
  });

  it("Validates 2-party and 3-party transfer directions and cash boot conservation (sum = 0)", async () => {
    const matchesRes = await request(app).get("/api/matches");
    const twoParty = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 2);
    const threeParty = matchesRes.body.data.find((m: { partyCount: number }) => m.partyCount === 3);

    expect(twoParty).toBeDefined();
    expect(threeParty).toBeDefined();

    // Verify 2-party transfer directions: A gives to B, B gives to A
    const leg0_2p = twoParty.exchangeLegs[0];
    const leg1_2p = twoParty.exchangeLegs[1];
    expect(leg0_2p.fromListingId).toBe(twoParty.cycle[0]);
    expect(leg0_2p.toListingId).toBe(twoParty.cycle[1]);
    expect(leg1_2p.fromListingId).toBe(twoParty.cycle[1]);
    expect(leg1_2p.toListingId).toBe(twoParty.cycle[0]);

    // Verify 3-party transfer directions: A gives to C, B gives to A, C gives to B
    const [legA, legB, legC] = threeParty.exchangeLegs;
    expect(legA.fromListingId).toBe(threeParty.cycle[0]);
    expect(legA.toListingId).toBe(threeParty.cycle[2]);
    expect(legB.fromListingId).toBe(threeParty.cycle[1]);
    expect(legB.toListingId).toBe(threeParty.cycle[0]);
    expect(legC.fromListingId).toBe(threeParty.cycle[2]);
    expect(legC.toListingId).toBe(threeParty.cycle[1]);

    // Verify Cash Boot Conservation: sum of signed amounts == 0
    const sumBoot2p = twoParty.boots.reduce((acc: number, b: { amount: number }) => acc + b.amount, 0);
    expect(Math.abs(sumBoot2p)).toBeLessThanOrEqual(0.01);

    const sumBoot3p = threeParty.boots.reduce((acc: number, b: { amount: number }) => acc + b.amount, 0);
    expect(Math.abs(sumBoot3p)).toBeLessThanOrEqual(0.01);
  });

  it("Workflow: Declining proposal releases all participant asset locks immediately", async () => {
    const matchesRes = await request(app).get("/api/matches");
    // Find an unlocked match
    const unlockedMatch = matchesRes.body.data.find((m: { listingIds: string[] }) =>
      m.listingIds.length === 2
    );
    expect(unlockedMatch).toBeDefined();

    // Propose
    const proposeRes = await request(app).post("/api/workflow/propose").send({ matchId: unlockedMatch.id });
    expect(proposeRes.status).toBe(200);

    // Decline by participant 1
    const declineRes = await request(app).post("/api/workflow/respond").send({
      matchId: unlockedMatch.id,
      listingId: unlockedMatch.listingIds[0],
      decision: "declined"
    });
    expect(declineRes.status).toBe(200);
    expect(declineRes.body.matchStatus).toBe("declined");

    // Verify listings unlocked
    const listing1 = await request(app).get(`/api/listings/${unlockedMatch.listingIds[0]}`);
    const listing2 = await request(app).get(`/api/listings/${unlockedMatch.listingIds[1]}`);
    expect(listing1.body.data.locked).toBe(false);
    expect(listing2.body.data.locked).toBe(false);
  });

  it("Workflow: Expiration releases all asset locks", async () => {
    const matchesRes = await request(app).get("/api/matches");
    const match = matchesRes.body.data[1];
    expect(match).toBeDefined();

    // Propose
    await request(app).post("/api/workflow/propose").send({ matchId: match.id });

    // Expire
    const expRes = await request(app).post("/api/workflow/expire").send({ matchId: match.id });
    expect(expRes.status).toBe(200);
    expect(expRes.body.matchStatus).toBe("expired");

    // Verify unlocked
    for (const lid of match.listingIds) {
      const res = await request(app).get(`/api/listings/${lid}`);
      expect(res.body.data.locked).toBe(false);
    }
  });

  it("GET /api/proposals and GET /api/activity return populated records", async () => {
    const propRes = await request(app).get("/api/proposals");
    expect(propRes.status).toBe(200);
    expect(propRes.body.success).toBe(true);
    expect(propRes.body.data.length).toBeGreaterThan(0);

    const actRes = await request(app).get("/api/activity");
    expect(actRes.status).toBe(200);
    expect(actRes.body.success).toBe(true);
    expect(actRes.body.data.length).toBeGreaterThan(0);
  });
});
