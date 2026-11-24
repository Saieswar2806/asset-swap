import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";

describe("Asset Swap Full-Stack API Integration Tests", () => {
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
    const invalidApprove = await request(app).post(`/api/admin/listings/${listingId}/review`).send({
      action: "approve",
      reviewedValue: 0
    });
    expect(invalidApprove.status).toBe(400);

    // 3. Approve with manual broker valuation of ₹3.2 Cr
    const validApprove = await request(app).post(`/api/admin/listings/${listingId}/review`).send({
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
});
