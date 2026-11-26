import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";

describe("Broker-Assisted Property Registration & Comparable Property Recommendations", () => {
  let adminToken: string;
  let broker1Token: string;
  let broker2Token: string;
  let ownerToken: string;

  beforeAll(async () => {
    // 1. Authenticate Admin (admin@asset-swap.local / Admin@123)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    adminToken = adminRes.body.token || adminRes.body.data?.token;

    // 2. Authenticate Approved Broker 1 (Kavitha Murthy: broker-001)
    const b1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });
    broker1Token = b1Res.body.token || b1Res.body.data?.token;

    // 3. Authenticate Approved Broker 2 (Suresh Rao: broker-002)
    const b2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "suresh.rao@broker.local", password: "Broker@123" });
    broker2Token = b2Res.body.token || b2Res.body.data?.token;

    // 4. Authenticate Property Owner (Naveen Hegde: OWNER-001)
    const oRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    ownerToken = oRes.body.token || oRes.body.data?.token;
  });

  afterAll(() => {
    // Teardown test properties and reviews
    try {
      db.exec(`
        DELETE FROM audit_logs WHERE details LIKE '%test_broker_assisted_%' OR entityId LIKE 'ASSET-TEST-%';
        DELETE FROM notifications WHERE message LIKE '%test_broker_assisted_%' OR entityId LIKE 'ASSET-TEST-%';
        DELETE FROM property_reviews WHERE listingId LIKE 'ASSET-TEST-%';
        DELETE FROM exchange_requirements WHERE listingId LIKE 'ASSET-TEST-%';
        DELETE FROM listings WHERE id LIKE 'ASSET-TEST-%' OR title LIKE '%test_broker_assisted_%';
        DELETE FROM users WHERE email LIKE '%test_owner_spec_%' OR id LIKE 'OWNER-B-TEST-%';
      `);
    } catch {
      // non-fatal
    }
  });

  describe("A. Broker-Assisted Property Registration", () => {
    let createdSwapListingId: string;
    let createdSellListingId: string;

    it("1. Broker can register a property for an existing owner with SWAP intention and exchange preferences", async () => {
      const payload = {
        owner: {
          name: "Naveen Hegde",
          phone: "+91 98450 00001",
          email: "naveen.hegde@owner.local",
          preferredContactMethod: "phone",
          address: "Indiranagar, Bengaluru"
        },
        consent: {
          status: "consent_provided",
          documentationRef: "MANDATE-TEST-2026-001",
          notes: "Physical signed mandate letter on file"
        },
        property: {
          title: "test_broker_assisted_ residential plot in Indiranagar",
          propertyType: "plot_site",
          district: "Bengaluru Urban",
          taluk: "Bengaluru East",
          locality: "Indiranagar",
          pincode: "560038",
          area: 2400,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 28000000,
          khataType: "A-Khata",
          surveyNumber: "Sy. 102/3",
          conversionStatus: "BDA Approved",
          description: "Prime corner residential site with immediate swap preference."
        },
        intent: "swap",
        swapPreferences: {
          desiredPropertyTypes: ["plot_site", "independent_house"],
          preferredDistricts: ["Bengaluru Urban"],
          preferredLocalities: ["Koramangala", "HSR Layout"],
          minArea: 2000,
          minAreaUnit: "sq_ft",
          maxCashToPay: 3000000,
          maxCashToReceive: 5000000
        }
      };

      const res = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${broker1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      createdSwapListingId = res.body.data.id;

      // Verify correct owner association (Naveen Hegde OWNER-001)
      expect(res.body.data.ownerId).toBe("OWNER-001");
      expect(res.body.data.ownerName).toBe("Naveen Hegde");

      // Verify submitting broker recording
      expect(res.body.data.submittedByBrokerId).toBe("broker-001");
      expect(res.body.data.submittedByBrokerName).toContain("Kavitha Murthy");

      // Verify consent status
      expect(res.body.data.consentStatus).toBe("consent_provided");
      expect(res.body.data.consentDocumentationRef).toBe("MANDATE-TEST-2026-001");

      // Verify transaction intention is swap
      expect(res.body.data.intent).toBe("swap");
      expect(res.body.data.status).toBe("submitted");

      // Verify exchange requirements were saved
      const reqRow = db.prepare("SELECT * FROM exchange_requirements WHERE listingId = ?").get(createdSwapListingId) as any;
      expect(reqRow).toBeDefined();
      expect(JSON.parse(reqRow.desiredPropertyTypes)).toContain("plot_site");
      expect(reqRow.minArea).toBe(2000);
    });

    it("2. Broker can register a property for a NEW owner with SELL intention and sale details", async () => {
      const uniquePhone = `+91 98450 ${Date.now().toString().slice(-5)}`;
      const uniqueEmail = `test_owner_spec_${Date.now()}@client.local`;

      const payload = {
        owner: {
          name: "Sanjay Gupta",
          phone: uniquePhone,
          email: uniqueEmail,
          preferredContactMethod: "whatsapp",
          address: "Whitefield, Bengaluru"
        },
        consent: {
          status: "verified_by_owner",
          documentationRef: "EXCLUSIVE-BROKER-MANDATE-089",
          notes: "Exclusive sale mandate for 90 days."
        },
        property: {
          title: "test_broker_assisted_ luxury apartment in Whitefield",
          propertyType: "apartment",
          district: "Bengaluru Urban",
          locality: "Whitefield",
          pincode: "560066",
          area: 1850,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 14500000,
          bedrooms: 3,
          bathrooms: 3,
          description: "High-floor apartment with panoramic views."
        },
        intent: "sell",
        saleDetails: {
          askingPrice: 15500000,
          saleDescription: "Direct sale with clear title and bank loan approved.",
          isNegotiable: true
        }
      };

      const res = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${broker1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      createdSellListingId = res.body.data.id;

      // Verify new owner was created in database
      const newOwner = db.prepare("SELECT * FROM users WHERE email = ?").get(uniqueEmail) as any;
      expect(newOwner).toBeDefined();
      expect(newOwner.name).toBe("Sanjay Gupta");
      expect(newOwner.role).toBe("owner");

      // Verify listing fields
      expect(res.body.data.intent).toBe("sell");
      expect(res.body.data.askingPrice).toBe(15500000);
      expect(res.body.data.submittedByBrokerId).toBe("broker-001");
      expect(res.body.data.consentStatus).toBe("verified_by_owner");

      // Verify Sell listing does NOT have exchange_requirements
      const reqRow = db.prepare("SELECT * FROM exchange_requirements WHERE listingId = ?").get(createdSellListingId);
      expect(reqRow).toBeUndefined();
    });

    it("3. Broker can retrieve their submitted properties via /api/broker/my-submissions", async () => {
      const res = await request(app)
        .get("/api/broker/my-submissions")
        .set("Authorization", `Bearer ${broker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const found = res.body.data.find((l: any) => l.id === createdSwapListingId);
      expect(found).toBeDefined();
      expect(found.submittedByBrokerId).toBe("broker-001");
      expect(found.ownerName).toBe("Naveen Hegde");
    });

    it("4. Broker can update/resubmit their own submitted property", async () => {
      const res = await request(app)
        .patch(`/api/broker/my-submissions/${createdSwapListingId}`)
        .set("Authorization", `Bearer ${broker1Token}`)
        .send({
          title: "test_broker_assisted_ residential plot in Indiranagar (Updated by Broker)",
          ownerDeclaredValue: 29000000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain("Updated by Broker");
      expect(res.body.data.ownerDeclaredValue).toBe(29000000);
    });

    it("5. Another broker CANNOT modify properties submitted by another broker", async () => {
      // Broker 2 tries to modify Broker 1's submission
      const res = await request(app)
        .patch(`/api/broker/my-submissions/${createdSwapListingId}`)
        .set("Authorization", `Bearer ${broker2Token}`)
        .send({
          title: "Hacked by Broker 2"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("authorized");
    });
  });

  describe("B. Comparable Property Recommendation Logic", () => {
    it("1. Returns relevant comparables strictly matching propertyType and location proximity", async () => {
      const targetListing = db.prepare("SELECT * FROM listings WHERE status = 'reviewed' LIMIT 1").get() as any;
      expect(targetListing).toBeDefined();

      const res = await request(app)
        .get(`/api/broker/listings/${targetListing.id}/comparables`)
        .set("Authorization", `Bearer ${broker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.target).toBeDefined();
      expect(res.body.target.propertyType).toBe(targetListing.propertyType);

      // Verify all recommended comparables strictly match the target's propertyType
      for (const comp of res.body.comparables) {
        expect(comp.propertyType).toBe(targetListing.propertyType);
        expect(comp.id).not.toBe(targetListing.id);
        expect(comp.referenceValuation).toBeGreaterThan(0);
        expect(comp.referenceType).toBeDefined();
        expect(comp.proximityLabel).toBeDefined();

        // Privacy: Verify owner contact details are NOT leaked
        expect((comp as any).ownerEmail).toBeUndefined();
        expect((comp as any).ownerPhone).toBeUndefined();
      }
    });

    it("2. Strictly avoids recommending apartments or commercial buildings when assessing agricultural land", async () => {
      // Pick an agricultural land asset
      const agListing = db.prepare("SELECT * FROM listings WHERE propertyType = 'agricultural_land' LIMIT 1").get() as any;
      expect(agListing).toBeDefined();

      const res = await request(app)
        .get(`/api/broker/listings/${agListing.id}/comparables`)
        .set("Authorization", `Bearer ${broker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      for (const comp of res.body.comparables) {
        expect(comp.propertyType).toBe("agricultural_land");
        expect(comp.propertyType).not.toBe("apartment");
        expect(comp.propertyType).not.toBe("commercial");
      }
    });

    it("3. Distinguishes reference valuation source (Broker-Reviewed vs Market Asking vs Owner-Declared)", async () => {
      const res = await request(app)
        .get("/api/broker/listings/ASSET-001/comparables")
        .set("Authorization", `Bearer ${broker1Token}`);

      expect(res.status).toBe(200);
      const sources = res.body.comparables.map((c: any) => c.referenceType);
      // Ensure the referenceType values conform to defined categories
      for (const st of sources) {
        expect(["verified_broker_valuation", "market_asking_price", "owner_declared_value"]).toContain(st);
      }
    });
  });

  describe("C. Broker Valuation Review with Comparables & Governance Rules", () => {
    let testListingId: string;

    beforeAll(() => {
      // Create a submitted listing by broker 1 to test self-review prohibition
      const now = new Date().toISOString();
      testListingId = "ASSET-TEST-999";
      db.prepare(`
        INSERT OR REPLACE INTO listings (
          id, ownerId, ownerName, title, category, propertyType,
          district, locality, area, areaUnit, ownerDeclaredValue,
          status, locked, intent, submittedByBrokerId, submittedByBrokerName,
          consentStatus, createdAt, updatedAt
        ) VALUES (
          ?, 'OWNER-001', 'Naveen Hegde', 'test_broker_assisted_ Plot for Governance Test', 'real_estate', 'plot_site',
          'Bengaluru Urban', 'Indiranagar', 1200, 'sq_ft', 12000000,
          'submitted', 0, 'swap', 'broker-001', 'Kavitha Murthy',
          'consent_provided', ?, ?
        )
      `).run(testListingId, now, now);
    });

    it("1. Self-Review Prohibition: Submitting broker CANNOT approve their own assisted registration", async () => {
      const res = await request(app)
        .post(`/api/broker/listings/${testListingId}/review`)
        .set("Authorization", `Bearer ${broker1Token}`) // broker 1 is submitter
        .send({
          action: "approve",
          reviewedValue: 12500000,
          internalNotes: "Attempting self-review."
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("prohibited from reviewing or approving their own");
    });

    it("2. Independent broker CAN review and approve with selected comparable property IDs", async () => {
      // Broker 2 (independent) reviews Broker 1's submission
      const res = await request(app)
        .post(`/api/broker/listings/${testListingId}/review`)
        .set("Authorization", `Bearer ${broker2Token}`) // broker 2 is independent
        .send({
          action: "approve",
          reviewedValue: 12800000,
          internalNotes: "Independent broker assessment using nearby plot references.",
          selectedComparableIds: ["ASSET-002", "ASSET-004"]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("reviewed");
      expect(res.body.data.reviewedValue).toBe(12800000);

      // Verify selectedComparableIds persisted in property_reviews
      const reviewRow = db.prepare("SELECT * FROM property_reviews WHERE listingId = ?").get(testListingId) as any;
      expect(reviewRow).toBeDefined();
      expect(reviewRow.reviewerId).toBe("broker-002");
      expect(reviewRow.reviewedValue).toBe(12800000);
      expect(reviewRow.selectedComparableIds).toContain("ASSET-002");
    });

    it("3. Consent Enforcement: Cannot approve listing when owner consent is pending_consent", async () => {
      const pendingListingId = "ASSET-TEST-888";
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO listings (
          id, ownerId, ownerName, title, category, propertyType,
          district, locality, area, areaUnit, ownerDeclaredValue,
          status, locked, intent, submittedByBrokerId, submittedByBrokerName,
          consentStatus, createdAt, updatedAt
        ) VALUES (
          ?, 'OWNER-001', 'Naveen Hegde', 'test_broker_assisted_ Pending Consent Asset', 'real_estate', 'plot_site',
          'Bengaluru Urban', 'Indiranagar', 1500, 'sq_ft', 15000000,
          'submitted', 0, 'swap', 'broker-001', 'Kavitha Murthy',
          'pending_consent', ?, ?
        )
      `).run(pendingListingId, now, now);

      // Independent broker tries to approve
      const res = await request(app)
        .post(`/api/broker/listings/${pendingListingId}/review`)
        .set("Authorization", `Bearer ${broker2Token}`)
        .send({
          action: "approve",
          reviewedValue: 15000000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("owner authorization status is pending");
    });
  });
});
