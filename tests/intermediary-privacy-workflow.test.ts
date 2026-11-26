import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Intermediary Platform Privacy, Statuses & Coordination Workflows", () => {
  let adminToken = "";
  let brokerToken = "";
  let sellerToken = "";
  let buyerToken = "";
  let swapOwnerAToken = "";
  let swapOwnerBToken = "";

  const createdListingIds: string[] = [];
  const createdInquiryIds: string[] = [];
  const createdMatchIds: string[] = [];

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

    const owner1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    expect(owner1Res.status).toBe(200);
    sellerToken = owner1Res.body.token;
    swapOwnerAToken = owner1Res.body.token;

    const owner2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "sunil.kulkarni@owner.local", password: "Owner@123" });
    expect(owner2Res.status).toBe(200);
    buyerToken = owner2Res.body.token;
    swapOwnerBToken = owner2Res.body.token;
  });

  afterAll(() => {
    for (const id of createdInquiryIds) {
      db.prepare("DELETE FROM purchase_coordination_timeline WHERE inquiryId = ?").run(id);
      db.prepare("DELETE FROM buyer_inquiries WHERE id = ?").run(id);
    }
    for (const mid of createdMatchIds) {
      db.prepare("DELETE FROM match_responses WHERE matchId = ?").run(mid);
      db.prepare("DELETE FROM match_participants WHERE matchId = ?").run(mid);
      db.prepare("DELETE FROM coordination_timeline WHERE matchId = ?").run(mid);
      db.prepare("DELETE FROM matches WHERE id = ?").run(mid);
    }
    for (const lid of createdListingIds) {
      db.prepare("DELETE FROM property_reviews WHERE listingId = ?").run(lid);
      db.prepare("DELETE FROM exchange_requirements WHERE listingId = ?").run(lid);
      db.prepare("DELETE FROM listings WHERE id = ?").run(lid);
    }
  });

  describe("1. Property Status Accuracy & Persistence", () => {
    it("Newly registered property starts as 'submitted' rather than 'reviewed' or 'rejected'", async () => {
      const regRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          title: "JP Nagar Test Villa",
          propertyType: "independent_house",
          district: "Bengaluru",
          locality: "JP Nagar",
          area: 2400,
          areaUnit: "sqft",
          ownerDeclaredValue: 19500000,
          intent: "sell",
          askingPrice: 20000000
        });

      expect([200, 201]).toContain(regRes.status);
      const listingId = regRes.body.data.id;
      createdListingIds.push(listingId);

      const ownerListings = await request(app)
        .get("/api/owner/listings")
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(ownerListings.status).toBe(200);
      const found = ownerListings.body.data.find((l: any) => l.id === listingId);
      expect(found).toBeDefined();
      expect(found.status).toBe("submitted");
    });
  });

  describe("2. Privacy-Protected Buy & Sell Inquiries and Admin Coordination", () => {
    let saleListingId = "";
    let inquiryId = "";

    it("Public listing endpoints never expose owner phone or email", async () => {
      const regRes = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          title: "Sadashivanagar Privacy Sale Plot",
          propertyType: "plot_site",
          district: "Bengaluru",
          locality: "Sadashivanagar",
          area: 3000,
          areaUnit: "sqft",
          ownerDeclaredValue: 22000000,
          intent: "sell",
          askingPrice: 23000000
        });
      expect([200, 201]).toContain(regRes.status);
      saleListingId = regRes.body.data.id;
      createdListingIds.push(saleListingId);

      // Broker reviews & approves it via /api/broker/listings/:id/review
      const revRes = await request(app)
        .post(`/api/broker/listings/${saleListingId}/review`)
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ action: "approve", reviewedValue: 22500000, internalNotes: "Approved for privacy test" });
      expect(revRes.status).toBe(200);

      const buyList = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${buyerToken}`);

      expect(buyList.status).toBe(200);
      const listed = buyList.body.data.find((l: any) => l.id === saleListingId);
      expect(listed).toBeDefined();
      expect(listed.ownerEmail).toBeUndefined();
      expect(listed.ownerPhone).toBeUndefined();

      const singleList = await request(app)
        .get(`/api/listings/${saleListingId}`)
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(singleList.status).toBe(200);
      expect(singleList.body.data.ownerEmail).toBeUndefined();
      expect(singleList.body.data.ownerPhone).toBeUndefined();
    });

    it("Buyer inquiry creation hides seller/buyer contacts and enforces duplicate prevention", async () => {
      const res = await request(app)
        .post("/api/buy/inquiries")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({
          listingId: saleListingId,
          message: "Interested in scheduling an Admin-coordinated inspection.",
          offerAmount: 22000000,
          buyerPhone: "+91 99999 00000" // Attempt client phone spoof
        });

      expect([200, 201]).toContain(res.status);
      inquiryId = res.body.data.id;
      createdInquiryIds.push(inquiryId);

      expect(res.body.data.sellerResponse).toBe("pending");
      expect(res.body.data.adminStatus).toBe("pending");
      expect(res.body.data.coordinationStatus).toBe("awaiting_seller_response");

      // Duplicate pending inquiry is blocked
      const dupRes = await request(app)
        .post("/api/buy/inquiries")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({
          listingId: saleListingId,
          message: "Duplicate request"
        });
      expect(dupRes.status).toBe(400);

      // Buyer's /my-inquiries omits contact details
      const myInqs = await request(app)
        .get("/api/buy/my-inquiries")
        .set("Authorization", `Bearer ${buyerToken}`);
      const myRow = myInqs.body.data.find((i: any) => i.id === inquiryId);
      expect(myRow).toBeDefined();
      expect(myRow.sellerEmail).toBeUndefined();
      expect(myRow.sellerPhone).toBeUndefined();
      expect(myRow.buyerEmail).toBeUndefined();
      expect(myRow.buyerPhone).toBeUndefined();
    });

    it("Seller inquiry feed strips buyerEmail, buyerPhone, and buyerId", async () => {
      const sellInqs = await request(app)
        .get("/api/sell/inquiries")
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(sellInqs.status).toBe(200);
      const row = sellInqs.body.data.find((i: any) => i.id === inquiryId);
      expect(row).toBeDefined();
      expect(row.buyerName).toBe("Sunil Kulkarni");
      expect(row.buyerEmail).toBeUndefined();
      expect(row.buyerPhone).toBeUndefined();
      expect(row.buyerId).toBeUndefined();
    });

    it("Admin cannot approve purchase coordination before Seller accepts, then full coordination works without marking property sold", async () => {
      // Admin tries approving before seller response
      const earlyApprove = await request(app)
        .post(`/api/admin/purchase-interests/${inquiryId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "approve" });
      expect(earlyApprove.status).toBe(400);

      // Seller accepts interest
      const sellerAccept = await request(app)
        .post(`/api/sell/inquiries/${inquiryId}/respond`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ decision: "accepted", notes: "Happy for Admin to arrange site visit." });
      expect(sellerAccept.status).toBe(200);
      expect(sellerAccept.body.data.sellerResponse).toBe("accepted");
      expect(sellerAccept.body.data.coordinationStatus).toBe("awaiting_admin_review");

      // Admin approves mutual agreement
      const adminApprove = await request(app)
        .post(`/api/admin/purchase-interests/${inquiryId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "approve", notes: "Mutual consent confirmed." });
      expect(adminApprove.status).toBe(200);
      expect(adminApprove.body.data.adminStatus).toBe("approved_for_coordination");
      expect(adminApprove.body.data.coordinationStatus).toBe("awaiting_admin_coordination");

      // Admin advances coordination & schedules site visit
      const coordPatch = await request(app)
        .patch(`/api/admin/purchase-interests/${inquiryId}/coordination`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ coordinationStatus: "coordination_in_progress", notes: "Coordinating inspection window" });
      expect(coordPatch.status).toBe(200);
      expect(coordPatch.body.data.coordinationStatus).toBe("coordination_in_progress");

      const visitRes = await request(app)
        .post(`/api/admin/purchase-interests/${inquiryId}/site-visit`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          siteVisitDate: "2026-12-10T10:30",
          siteVisitLocation: "Sadashivanagar Site Gate",
          siteVisitNotes: "Asset Swap coordinator on site"
        });
      expect(visitRes.status).toBe(200);
      expect(visitRes.body.data.coordinationStatus).toBe("site_visit_scheduled");

      // Property must NOT be falsely marked sold automatically
      const listingDb = db.prepare("SELECT isSold FROM listings WHERE id = ?").get(saleListingId) as any;
      expect(listingDb.isSold).toBe(0);

      // Admin list sees full staff contacts & timeline
      const adminList = await request(app)
        .get("/api/admin/purchase-interests")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminList.status).toBe(200);
      const adminRow = adminList.body.data.find((i: any) => i.id === inquiryId);
      expect(adminRow.buyerEmail).toBeTruthy();
      expect(adminRow.sellerEmail).toBeTruthy();
      expect(Array.isArray(adminRow.timeline)).toBe(true);
      expect(adminRow.timeline.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("3. Swap Privacy, Formal Statuses, Consensus & Expired Exclusion", () => {
    it("GET /api/matches does not pollute DB with phantom proposed/declined matches and strips participant emails/phones", async () => {
      const beforeCount = (db.prepare("SELECT COUNT(*) as c FROM matches").get() as any).c;

      const res = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${swapOwnerAToken}`);

      expect(res.status).toBe(200);
      const afterCount = (db.prepare("SELECT COUNT(*) as c FROM matches").get() as any).c;
      expect(afterCount).toBe(beforeCount);

      for (const m of res.body.data) {
        if (m.participants) {
          for (const p of m.participants) {
            expect(p.ownerEmail).toBeUndefined();
            expect(p.ownerPhone).toBeUndefined();
          }
        }
      }
    });

    it("Owner proposals show formal statuses without contact leaks, require unanimous accept for Admin queue, and hide expired proposals", async () => {
      // Create two fresh isolated swap properties with Bengaluru coordinates so matcher discovers them
      const regA = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${swapOwnerAToken}`)
        .send({
          title: "Indiranagar Swap Test Unit A",
          propertyType: "apartment",
          district: "Bengaluru",
          locality: "Indiranagar",
          latitude: 12.9716,
          longitude: 77.6412,
          area: 1800,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 18000000,
          intent: "swap",
          wants: {
            propertyTypes: ["apartment", "independent_house"],
            preferredDistricts: ["Bengaluru"],
            preferredLocations: ["Koramangala", "Indiranagar"],
            minValue: 15000000,
            maxValue: 21000000
          }
        });
      expect([200, 201]).toContain(regA.status);
      const idA = regA.body.data.id;
      createdListingIds.push(idA);

      const regB = await request(app)
        .post("/api/listings")
        .set("Authorization", `Bearer ${swapOwnerBToken}`)
        .send({
          title: "Koramangala Swap Test Unit B",
          propertyType: "apartment",
          district: "Bengaluru",
          locality: "Koramangala",
          latitude: 12.9352,
          longitude: 77.6245,
          area: 1850,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 18000000,
          intent: "swap",
          wants: {
            propertyTypes: ["apartment", "independent_house"],
            preferredDistricts: ["Bengaluru"],
            preferredLocations: ["Indiranagar", "Koramangala"],
            minValue: 15000000,
            maxValue: 21000000
          }
        });
      expect([200, 201]).toContain(regB.status);
      const idB = regB.body.data.id;
      createdListingIds.push(idB);

      // Broker approves both via /api/broker/listings/:id/review
      const revA = await request(app)
        .post(`/api/broker/listings/${idA}/review`)
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ action: "approve", reviewedValue: 18000000 });
      expect(revA.status).toBe(200);

      const revB = await request(app)
        .post(`/api/broker/listings/${idB}/review`)
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ action: "approve", reviewedValue: 18000000 });
      expect(revB.status).toBe(200);

      // Fetch matches to confirm discovered matchId
      const matchesRes = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${swapOwnerAToken}`);
      expect(matchesRes.status).toBe(200);

      const pairMatch = matchesRes.body.data.find(
        (m: any) => m.listingIds.includes(idA) && m.listingIds.includes(idB) && m.partyCount === 2
      );
      expect(pairMatch).toBeDefined();
      const expectedMatchId = pairMatch.id;
      createdMatchIds.push(expectedMatchId);

      // Owner A proposes swap
      const proposeRes = await request(app)
        .post("/api/workflow/propose")
        .set("Authorization", `Bearer ${swapOwnerAToken}`)
        .send({ matchId: expectedMatchId });
      expect(proposeRes.status).toBe(200);
      expect(proposeRes.body.success).toBe(true);
      expect(proposeRes.body.matchId).toBe(expectedMatchId);

      // Initially both owners have pending responses (never Declined or Expired)
      const propsA0 = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${swapOwnerAToken}`);
      const rowA0 = propsA0.body.data.find((p: any) => p.id === expectedMatchId);
      expect(rowA0).toBeDefined();
      expect(rowA0.formalStatus).toBe("Awaiting Your Response");

      // Owner A accepts their side
      const acceptA = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${swapOwnerAToken}`)
        .send({ matchId: expectedMatchId, listingId: idA, decision: "accepted" });
      expect(acceptA.status).toBe(200);
      expect(acceptA.body.matchStatus).toBe("proposed");

      // Owner A sees Your Response: Accepted, Owner B sees Awaiting Your Response
      const propsA = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${swapOwnerAToken}`);
      const rowA = propsA.body.data.find((p: any) => p.id === expectedMatchId);
      expect(rowA).toBeDefined();
      expect(rowA.formalStatus).toContain("Your Response: Accepted");
      expect(rowA.participants.every((p: any) => !p.ownerEmail && !p.ownerPhone)).toBe(true);

      const propsB = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${swapOwnerBToken}`);
      const rowB = propsB.body.data.find((p: any) => p.id === expectedMatchId);
      expect(rowB).toBeDefined();
      expect(rowB.formalStatus).toBe("Awaiting Your Response");
      expect(rowB.participants.every((p: any) => !p.ownerEmail && !p.ownerPhone)).toBe(true);

      // Not yet in Admin Accepted Exchanges queue before unanimous accept
      const adminExBefore = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminExBefore.body.data.find((e: any) => e.id === expectedMatchId)).toBeUndefined();

      // Owner B accepts
      const acceptB = await request(app)
        .post("/api/workflow/respond")
        .set("Authorization", `Bearer ${swapOwnerBToken}`)
        .send({ matchId: expectedMatchId, listingId: idB, decision: "accepted" });
      expect(acceptB.status).toBe(200);
      expect(acceptB.body.matchStatus).toBe("accepted");

      // Now present in Admin Accepted Exchanges with acceptance timestamps
      const adminExAfter = await request(app)
        .get("/api/admin/exchanges")
        .set("Authorization", `Bearer ${adminToken}`);
      const queued = adminExAfter.body.data.find((e: any) => e.id === expectedMatchId);
      expect(queued).toBeDefined();
      expect(queued.enteredQueueAt).toBeTruthy();
      expect(queued.participants.every((p: any) => Boolean(p.respondedAt))).toBe(true);

      // Test GET /api/matches/:id also strips participant emails/phones
      const matchDet = await request(app)
        .get(`/api/matches/${expectedMatchId}`)
        .set("Authorization", `Bearer ${swapOwnerAToken}`);
      expect(matchDet.status).toBe(200);
      expect(matchDet.body.data.ownerContacts).toBeUndefined();
      expect(matchDet.body.data.participants.every((p: any) => !p.ownerEmail && !p.ownerPhone)).toBe(true);

      // Expired match must NOT appear in Owner /api/proposals
      const expMatchId = `test-expired-swap-${Date.now()}`;
      createdMatchIds.push(expMatchId);
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO matches (id, matchType, partyCount, cycle, listingIds, totalAbsoluteBoot, locationScoreKm, matchScore, status, explanation, reasons, exchangeLegs, createdAt, updatedAt)
        VALUES (?, 'direct_2p', 2, '[]', ?, 0, 1, 88, 'expired', 'Expired check', '[]', '[]', ?, ?)
      `).run(expMatchId, JSON.stringify([idA, idB]), nowIso, nowIso);

      const propsExpiredCheck = await request(app)
        .get("/api/proposals")
        .set("Authorization", `Bearer ${swapOwnerAToken}`);
      expect(propsExpiredCheck.body.data.find((p: any) => p.id === expMatchId)).toBeUndefined();
    });
  });

  describe("4. Admin Complete User Details API", () => {
    it("Non-admin receives 403 on GET /api/admin/users/:id", async () => {
      const res = await request(app)
        .get("/api/admin/users/OWNER-001")
        .set("Authorization", `Bearer ${sellerToken}`);
      expect(res.status).toBe(403);
    });

    it("Admin fetches full details for real user including properties, interests, and proposals", async () => {
      const usersRes = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(usersRes.status).toBe(200);
      const targetUser = usersRes.body.data.find((u: any) => u.email === "naveen.hegde@owner.local");
      expect(targetUser).toBeDefined();

      const detailRes = await request(app)
        .get(`/api/admin/users/${targetUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.email).toBe("naveen.hegde@owner.local");
      expect(Array.isArray(detailRes.body.data.properties)).toBe(true);
      expect(Array.isArray(detailRes.body.data.buyInterests)).toBe(true);
      expect(Array.isArray(detailRes.body.data.swapProposals)).toBe(true);
    });
  });
});
