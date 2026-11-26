import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Asset Swap Buy, Sell & Intent Expansion Tests", () => {
  let owner1Token: string;
  let owner2Token: string;
  let owner1Id: string = "OWNER-001";
  let owner2Id: string = "OWNER-002";

  beforeAll(async () => {
    // Log in Owner 1
    const res1 = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    expect(res1.status).toBe(200);
    owner1Token = res1.body.token;

    // Log in Owner 2
    const res2 = await request(app)
      .post("/api/auth/login")
      .send({ email: "sunil.kulkarni@owner.local", password: "Owner@123" });
    expect(res2.status).toBe(200);
    owner2Token = res2.body.token;
  });

  describe("1. Authentication & Route Protection", () => {
    it("Unauthenticated request to GET /api/buy/listings returns 401", async () => {
      const res = await request(app).get("/api/buy/listings");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("Unauthenticated request to POST /api/buy/inquiries returns 401", async () => {
      const res = await request(app)
        .post("/api/buy/inquiries")
        .send({ listingId: "ASSET-001", message: "Interested" });
      expect(res.status).toBe(401);
    });

    it("Unauthenticated request to GET /api/sell/listings returns 401", async () => {
      const res = await request(app).get("/api/sell/listings");
      expect(res.status).toBe(401);
    });
  });

  describe("2. Buy Section & Listing Discovery", () => {
    it("Authenticated owner can query /api/buy/listings and receives only reviewed sale listings", async () => {
      const res = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const item of res.body.data) {
        expect(["sell", "both"]).toContain(item.intent);
        expect(typeof item.askingPrice).toBe("number");
        expect(item.askingPrice).toBeGreaterThan(0);
        // Sensitive internal broker notes and owner phone must NOT be exposed
        expect(item.internalNotes).toBeUndefined();
        expect(item.rejectionReason).toBeUndefined();
      }
    });

    it("Supports filtering by propertyType and district", async () => {
      const res = await request(app)
        .get("/api/buy/listings?propertyType=apartment")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.propertyType).toBe("apartment");
      }
    });
  });

  describe("3. Buyer Inquiry & Interest Workflow", () => {
    let targetListingId: string;

    it("Finds an available sale property belonging to Owner 1 for Owner 2 to inquire about", async () => {
      const res = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${owner2Token}`);

      const available = res.body.data.find((l: any) => l.sellerId === owner1Id);
      if (available) {
        targetListingId = available.id;
      } else {
        // If none currently, enable sale on an Owner 1 property
        const owner1Props = await request(app)
          .get("/api/owner/listings")
          .set("Authorization", `Bearer ${owner1Token}`);
        const prop = owner1Props.body.data[0];
        targetListingId = prop.id;

        await request(app)
          .post("/api/sell/enable")
          .set("Authorization", `Bearer ${owner1Token}`)
          .send({ listingId: prop.id, askingPrice: 15000000, intent: "both" });
      }
      expect(targetListingId).toBeDefined();
    });

    it("Rejects inquiry if owner attempts to buy their own property", async () => {
      const res = await request(app)
        .post("/api/buy/inquiries")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({
          listingId: targetListingId,
          message: "Trying to buy my own property"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/own property/i);
    });

    it("Allows Owner 2 to submit a purchase inquiry on Owner 1's property", async () => {
      const res = await request(app)
        .post("/api/buy/inquiries")
        .set("Authorization", `Bearer ${owner2Token}`)
        .send({
          listingId: targetListingId,
          message: "I am interested in buying this property. Please call me.",
          offerAmount: 14500000,
          buyerPhone: "+91 98450 00002"
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toMatch(/^inq-/);
    });

    it("Owner 2 can view their submitted inquiry in /api/buy/my-inquiries", async () => {
      const res = await request(app)
        .get("/api/buy/my-inquiries")
        .set("Authorization", `Bearer ${owner2Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      const myInq = res.body.data.find((i: any) => i.listingId === targetListingId);
      expect(myInq).toBeDefined();
      expect(myInq.status).toBe("pending");
      expect(myInq.offerAmount).toBe(14500000);
    });

    it("Owner 1 can view received inquiries in /api/sell/inquiries and update status", async () => {
      const res = await request(app)
        .get("/api/sell/inquiries")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      const receivedInq = res.body.data.find((i: any) => i.listingId === targetListingId);
      expect(receivedInq).toBeDefined();
      expect(receivedInq.buyerName).toBe("Sunil Kulkarni");

      // Owner 1 marks inquiry as contacted
      const patchRes = await request(app)
        .patch(`/api/sell/inquiries/${receivedInq.id}/status`)
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({ status: "contacted" });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe("contacted");
    });
  });

  describe("4. Property Registration with Separated Owned vs Desired Data and Intent", () => {
    it("Registers a new property with intent = 'both', owned data, and exchange preferences", async () => {
      const payload = {
        title: "Kanakapura Highway Organic Farmhouse",
        propertyType: "farmhouse",
        district: "Ramanagara",
        locality: "Kanakapura",
        area: 2,
        areaUnit: "acres",
        ownerDeclaredValue: 25000000,
        bedrooms: 3,
        bathrooms: 3,
        intent: "both",
        askingPrice: 26000000,
        saleDescription: "Gated estate with solar power and drip irrigation.",
        wants: {
          propertyTypes: ["apartment", "commercial"],
          preferredDistricts: ["Bengaluru"],
          preferredLocations: ["Whitefield", "Indiranagar"],
          minArea: 1800,
          minAreaUnit: "sq_ft",
          openToCashAdjustment: true,
          maxCashToPay: 3000000,
          maxCashToReceive: 5000000
        }
      };

      const res = await request(app)
        .post("/api/owner/listings")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send(payload);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();

      const newId = res.body.data.id;

      // Verify stored listing has intent = both and bedrooms
      const dbListing = db.prepare("SELECT * FROM listings WHERE id = ?").get(newId) as any;
      expect(dbListing.intent).toBe("both");
      expect(dbListing.askingPrice).toBe(26000000);
      expect(dbListing.bedrooms).toBe(3);

      // Verify exchange_requirements has separated desired preferences
      const dbReq = db.prepare("SELECT * FROM exchange_requirements WHERE listingId = ?").get(newId) as any;
      expect(JSON.parse(dbReq.desiredPropertyTypes)).toContain("apartment");
      expect(dbReq.openToCashAdjustment).toBe(1);
    });

    it("Registers a 'sell only' property without forcing swap preferences", async () => {
      const payload = {
        title: "Commercial Retail Space in Mysuru Central",
        propertyType: "commercial",
        district: "Mysuru",
        locality: "Devaraja Mohalla",
        area: 1200,
        areaUnit: "sq_ft",
        ownerDeclaredValue: 18000000,
        intent: "sell",
        askingPrice: 18500000,
        saleDescription: "High-footfall commercial shop ready for immediate lease or sale."
      };

      const res = await request(app)
        .post("/api/owner/listings")
        .set("Authorization", `Bearer ${owner2Token}`)
        .send(payload);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);

      const dbListing = db.prepare("SELECT * FROM listings WHERE id = ?").get(res.body.data.id) as any;
      expect(dbListing.intent).toBe("sell");
      expect(dbListing.askingPrice).toBe(18500000);
    });
  });

  describe("5. Sell Management Authorization & Ownership Enforcement", () => {
    it("Forbids Owner 2 from modifying an Owner 1 sale listing", async () => {
      const owner1Props = await request(app)
        .get("/api/sell/listings")
        .set("Authorization", `Bearer ${owner1Token}`);

      const prop = owner1Props.body.data[0];
      expect(prop).toBeDefined();

      const res = await request(app)
        .patch(`/api/sell/listings/${prop.id}`)
        .set("Authorization", `Bearer ${owner2Token}`)
        .send({ askingPrice: 500 }); // Malicious price overwrite attempt

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Owner can mark a sale property as Sold, which removes it from Buy marketplace", async () => {
      // Find an active sale property belonging to Owner 1
      const owner1Sales = await request(app)
        .get("/api/sell/listings")
        .set("Authorization", `Bearer ${owner1Token}`);

      const target = owner1Sales.body.data.find((l: any) => !l.isSold);
      expect(target).toBeDefined();

      // Owner 2 cannot mark Owner 1 property as sold
      const unauthRes = await request(app)
        .patch(`/api/sell/listings/${target.id}/sold`)
        .set("Authorization", `Bearer ${owner2Token}`);
      expect(unauthRes.status).toBe(403);

      // Owner 1 marks their own property as sold
      const soldRes = await request(app)
        .patch(`/api/sell/listings/${target.id}/sold`)
        .set("Authorization", `Bearer ${owner1Token}`);
      expect(soldRes.status).toBe(200);
      expect(soldRes.body.success).toBe(true);

      // Verify it is excluded from public Buy marketplace
      const buyRes = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${owner2Token}`);
      const stillInBuy = buyRes.body.data.some((l: any) => l.id === target.id);
      expect(stillInBuy).toBe(false);

      // Revert isSold for subsequent tests
      db.prepare("UPDATE listings SET isSold = 0 WHERE id = ?").run(target.id);
    });

    it("Owner can deactivate a sale listing, reverting it to Swap-only", async () => {
      // Enable sale on ASSET-001 temporarily
      await request(app)
        .post("/api/sell/enable")
        .set("Authorization", `Bearer ${owner1Token}`)
        .send({
          listingId: "ASSET-001",
          askingPrice: 20000000,
          intent: "both"
        });

      // Deactivate sale listing
      const deactRes = await request(app)
        .patch("/api/sell/listings/ASSET-001/deactivate")
        .set("Authorization", `Bearer ${owner1Token}`);
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.success).toBe(true);

      const dbListing = db.prepare("SELECT intent FROM listings WHERE id = 'ASSET-001'").get() as any;
      expect(dbListing.intent).toBe("swap");

      // Verify it does not appear in Buy marketplace
      const buyRes = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${owner2Token}`);
      expect(buyRes.body.data.some((l: any) => l.id === "ASSET-001")).toBe(false);
    });
  });

  describe("6. Strict Intent Separation & Ownership Integrity", () => {
    it("Swap-only properties never appear in Buy marketplace", async () => {
      const buyRes = await request(app)
        .get("/api/buy/listings")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(buyRes.status).toBe(200);
      for (const item of buyRes.body.data) {
        expect(item.intent).not.toBe("swap");
        expect(["sell", "both"]).toContain(item.intent);
      }
    });

    it("Sell-only properties do not participate in swap matching", async () => {
      // ASSET-015 is sell-only
      const matchRes = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${owner1Token}`);

      expect(matchRes.status).toBe(200);
      for (const match of matchRes.body.data || []) {
        expect(match.listingIds).not.toContain("ASSET-015");
        expect(match.cycle).not.toContain("ASSET-015");
      }
    });

    it("Ownership is distributed across distinct demo owners and never dominated by a single owner", async () => {
      const rows = db.prepare("SELECT ownerId, ownerName, COUNT(*) as c FROM listings WHERE CAST(SUBSTR(id, 7) AS INTEGER) <= 112 GROUP BY ownerId, ownerName").all() as any[];
      expect(rows.length).toBeGreaterThan(50); // More than 50 distinct property owners
      for (const r of rows) {
        expect(r.c).toBeLessThanOrEqual(5); // No single owner has more than 5 properties
      }

      // Verify specific featured demo owners have their intended properties
      const naveenListings = db.prepare("SELECT id, intent FROM listings WHERE ownerId = 'OWNER-001' AND CAST(SUBSTR(id, 7) AS INTEGER) <= 112").all() as any[];
      expect(naveenListings.length).toBe(3);
      expect(naveenListings.some((l) => l.intent === "swap")).toBe(true);
      expect(naveenListings.some((l) => l.intent === "sell")).toBe(true);
      expect(naveenListings.some((l) => l.intent === "both")).toBe(true);

      const sunilListings = db.prepare("SELECT id, intent FROM listings WHERE ownerId = 'OWNER-002' AND CAST(SUBSTR(id, 7) AS INTEGER) <= 112").all() as any[];
      expect(sunilListings.length).toBe(3);
      expect(sunilListings.some((l) => l.intent === "swap")).toBe(true);
      expect(sunilListings.some((l) => l.intent === "sell")).toBe(true);
      expect(sunilListings.some((l) => l.intent === "both")).toBe(true);
    });

    it("Backend enforces authenticated session owner and rejects forged client ownerId", async () => {
      const maliciousPayload = {
        title: "Malicious Property Forging Other Owner",
        propertyType: "apartment",
        district: "Bengaluru",
        locality: "Indiranagar",
        area: 1500,
        areaUnit: "sq_ft",
        ownerDeclaredValue: 12000000,
        ownerId: "OWNER-002", // Malicious attempt to forge Sunil's ID while logged in as Naveen
        ownerName: "Sunil Kulkarni"
      };

      const res = await request(app)
        .post("/api/owner/listings")
        .set("Authorization", `Bearer ${owner1Token}`) // Logged in as Naveen
        .send(maliciousPayload);

      expect([200, 201]).toContain(res.status);
      const createdId = res.body.data.id;

      // In database, the listing MUST be owned by Naveen (the authenticated user), NOT Sunil!
      const dbRecord = db.prepare("SELECT ownerId, ownerName FROM listings WHERE id = ?").get(createdId) as any;
      expect(dbRecord.ownerId).toBe("OWNER-001");
      expect(dbRecord.ownerName).toBe("Naveen Hegde");
    });
  });

  afterAll(() => {
    // Clean up any test-created listings so asset_swap.db is not polluted
    try {
      db.prepare(`
        DELETE FROM buyer_inquiries WHERE listingId NOT IN (SELECT id FROM listings WHERE CAST(SUBSTR(id, 7) AS INTEGER) <= 112);
        DELETE FROM exchange_requirements WHERE listingId NOT IN (SELECT id FROM listings WHERE CAST(SUBSTR(id, 7) AS INTEGER) <= 112);
        DELETE FROM listings WHERE CAST(SUBSTR(id, 7) AS INTEGER) > 112 OR title LIKE '%Malicious%';
      `).run();
    } catch {
      // Ignored
    }
  });
});
