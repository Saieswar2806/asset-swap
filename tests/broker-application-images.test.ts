import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db, rowToListing } from "../src/server/db.js";
import {
  getPropertyImages,
  getPropertyThumbnail,
  getPropertyTypeFallback,
  PROPERTY_TYPE_GALLERIES
} from "../src/propertyImages.js";
import type { PropertyType } from "../src/types.js";

describe("Broker Applications & Property Imagery Verification", () => {
  let adminToken = "";
  let ownerToken = "";
  let testBrokerId = "";
  let testBrokerEmail = "";

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    adminToken = adminLogin.body.token;

    // 2. Owner login
    const ownerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    ownerToken = ownerLogin.body.token;

    // 3. Create a unique pending test broker for this test suite
    testBrokerEmail = `test_broker_spec_${Date.now()}@spec.local`;
    const applyRes = await request(app)
      .post("/api/auth/broker-apply")
      .send({
        name: "Vijayalakshmi Rao",
        email: testBrokerEmail,
        password: "BrokerPassword@123",
        phone: "+91 98450 99887",
        agency: "Kaveri Heritage Property Advisors",
        licenseNumber: "KAR-RERA-2025-0042",
        jurisdiction: "Mysuru, Mandya, Chamarajanagar",
        experienceYears: 11
      });

    testBrokerId = applyRes.body.user.id;
  });

  afterAll(() => {
    // Clean up test brokers created in this test suite
    try {
      db.prepare("DELETE FROM users WHERE email LIKE 'test_broker_spec_%'").run();
      db.prepare("DELETE FROM users WHERE email LIKE 'test_reject_spec_%'").run();
    } catch {
      // ignore
    }
  });

  // =========================================================================
  // 1. ADMIN BROKER APPLICATION DETAILS & FIX REPEATED NAMES
  // =========================================================================
  describe("Admin Broker Applications Details & Listing Identity", () => {
    it("GET /api/admin/brokers lists brokers with distinct names and real database IDs", async () => {
      const res = await request(app)
        .get("/api/admin/brokers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify that brokers have unique IDs and legitimate fields
      const brokerIds = res.body.data.map((b: any) => b.id);
      const uniqueIds = new Set(brokerIds);
      expect(uniqueIds.size).toBe(brokerIds.length);

      // Verify created test broker is present
      const found = res.body.data.find((b: any) => b.id === testBrokerId);
      expect(found).toBeDefined();
      expect(found.name).toBe("Vijayalakshmi Rao");
      expect(found.agency).toBe("Kaveri Heritage Property Advisors");
      expect(found.licenseNumber).toBe("KAR-RERA-2025-0042");
    });

    it("GET /api/admin/brokers/:id returns complete details for a specific broker application", async () => {
      const res = await request(app)
        .get(`/api/admin/brokers/${testBrokerId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const broker = res.body.data;

      // Verify all required application fields
      expect(broker.id).toBe(testBrokerId);
      expect(broker.name).toBe("Vijayalakshmi Rao");
      expect(broker.email).toBe(testBrokerEmail);
      expect(broker.phone).toBe("+91 98450 99887");
      expect(broker.agency).toBe("Kaveri Heritage Property Advisors");
      expect(broker.licenseNumber).toBe("KAR-RERA-2025-0042");
      expect(broker.jurisdiction).toBe("Mysuru, Mandya, Chamarajanagar");
      expect(broker.experienceYears).toBe(11);
      expect(broker.status).toBe("pending");
      expect(broker.createdAt).toBeDefined();
      expect(broker.updatedAt).toBeDefined();
      expect(Array.isArray(broker.auditLogs)).toBe(true);
    });

    it("GET /api/admin/brokers/:id returns 404 for non-existent broker ID", async () => {
      const res = await request(app)
        .get("/api/admin/brokers/non-existent-broker-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Broker application not found");
    });

    it("GET /api/admin/brokers/:id returns 403 Forbidden for non-admin users", async () => {
      const res = await request(app)
        .get(`/api/admin/brokers/${testBrokerId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. BROKER APPROVAL & REJECTION WORKFLOW & DATABASE PERSISTENCE
  // =========================================================================
  describe("Broker Review Workflow & Database Persistence", () => {
    it("Admin approval updates SQLite database record to active, updates updatedAt, and writes audit log", async () => {
      // 1. Verify initially pending in DB
      const beforeRow = db.prepare("SELECT status, updatedAt FROM users WHERE id = ?").get(testBrokerId) as any;
      expect(beforeRow.status).toBe("pending");

      // 2. Admin approves via API
      const approveRes = await request(app)
        .post(`/api/admin/brokers/${testBrokerId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "approve" });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);

      // 3. Verify directly in SQLite database
      const afterRow = db.prepare("SELECT status, updatedAt FROM users WHERE id = ?").get(testBrokerId) as any;
      expect(afterRow.status).toBe("active");
      expect(new Date(afterRow.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeRow.updatedAt).getTime());

      // 4. Verify audit log entry in database
      const logRow = db.prepare("SELECT * FROM audit_logs WHERE entityId = ? AND action = 'admin_broker_approve'").get(testBrokerId) as any;
      expect(logRow).toBeDefined();
      expect(logRow.performedBy).toContain("Administrator");

      // 5. Approved broker can now log in and access broker functionality
      const brokerLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: testBrokerEmail, password: "BrokerPassword@123" });

      expect(brokerLogin.status).toBe(200);
      expect(brokerLogin.body.user.status).toBe("active");
      const bToken = brokerLogin.body.token;

      const brokerStats = await request(app)
        .get("/api/broker/dashboard/stats")
        .set("Authorization", `Bearer ${bToken}`);

      expect(brokerStats.status).toBe(200);
      expect(brokerStats.body.success).toBe(true);
    });

    it("Admin rejection updates database status to rejected, stores reason, and blocks access", async () => {
      // 1. Create a broker to reject
      const rejectEmail = `test_reject_spec_${Date.now()}@spec.local`;
      const applyRes = await request(app)
        .post("/api/auth/broker-apply")
        .send({
          name: "Devdas Nayak",
          email: rejectEmail,
          password: "BrokerPassword@123",
          agency: "Nayak Land Agency",
          licenseNumber: "KAR-RERA-EXPIRED"
        });

      const rejectBrokerId = applyRes.body.user.id;

      // 2. Admin rejects with explicit reason
      const rejectRes = await request(app)
        .post(`/api/admin/brokers/${rejectBrokerId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          action: "reject",
          rejectionReason: "RERA registration expired; renewal certificate missing from state database."
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);

      // 3. Verify SQLite persistence of rejected status and reason
      const dbRow = db.prepare("SELECT status, rejectionReason FROM users WHERE id = ?").get(rejectBrokerId) as any;
      expect(dbRow.status).toBe("rejected");
      expect(dbRow.rejectionReason).toBe("RERA registration expired; renewal certificate missing from state database.");

      // 4. Verify rejected broker cannot log in or access broker queue
      const loginAttempt = await request(app)
        .post("/api/auth/login")
        .send({ email: rejectEmail, password: "BrokerPassword@123" });

      expect(loginAttempt.status).toBe(403);
      expect(loginAttempt.body.error).toContain("rejected");
    });
  });

  // =========================================================================
  // 3. PROPERTY IMAGERY & MULTI-IMAGE GALLERIES
  // =========================================================================
  describe("Curated Property Imagery & Gallery Sets", () => {
    it("each property type has distinct, curated galleries relevant to its category", () => {
      const types: PropertyType[] = [
        "agricultural_land",
        "plot_site",
        "apartment",
        "independent_house",
        "farmhouse",
        "commercial"
      ];

      for (const t of types) {
        const galleries = PROPERTY_TYPE_GALLERIES[t];
        expect(galleries).toBeDefined();
        expect(galleries.length).toBeGreaterThan(0);
        // Each gallery set should have multiple images
        expect(galleries[0].length).toBeGreaterThanOrEqual(3);

        const images = getPropertyImages(t, 0);
        expect(images.length).toBeGreaterThanOrEqual(3);
        // Fallback is specific to category
        const fallback = getPropertyTypeFallback(t);
        expect(fallback).toBeDefined();
        expect(typeof fallback).toBe("string");
      }

      // Farmland images should not equal commercial images
      const farmImage = getPropertyTypeFallback("agricultural_land");
      const commercialImage = getPropertyTypeFallback("commercial");
      const apartmentImage = getPropertyTypeFallback("apartment");

      expect(farmImage).not.toBe(commercialImage);
      expect(farmImage).not.toBe(apartmentImage);
      expect(commercialImage).not.toBe(apartmentImage);
    });

    it("rowToListing populates images array and type-appropriate thumbnail", () => {
      const dbRow: any = {
        id: "ASSET-TEST-99",
        ownerId: "OWNER-001",
        ownerName: "Naveen Hegde",
        title: "Scenic Coconut Plantation",
        category: "real_estate",
        propertyType: "agricultural_land",
        district: "Ramanagara",
        taluk: "Channapatna",
        locality: "Harohalli",
        pincode: "562112",
        latitude: 12.6,
        longitude: 77.4,
        area: 4,
        areaUnit: "acres",
        ownerDeclaredValue: 15000000,
        reviewedValue: 15000000,
        status: "reviewed",
        locked: 0,
        intent: "swap",
        images: null,
        imageUrl: null
      };

      const listing = rowToListing(dbRow);

      expect(listing.images).toBeDefined();
      expect(Array.isArray(listing.images)).toBe(true);
      expect(listing.images!.length).toBeGreaterThanOrEqual(3);
      expect(listing.imageUrl).toBeDefined();
      expect(listing.imageUrl).toBe(listing.images![0]);
      expect(listing.metadata?.images).toEqual(listing.images);
    });

    it("new property creation via POST /api/owner/listings persists curated gallery images", async () => {
      const createRes = await request(app)
        .post("/api/owner/listings")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          title: "Mysuru Heritage Commercial Complex",
          propertyType: "commercial",
          district: "Mysuru",
          locality: "Devaraja Mohalla",
          area: 3200,
          areaUnit: "sq_ft",
          ownerDeclaredValue: 28000000,
          intent: "swap",
          wants: {
            propertyTypes: ["apartment"],
            preferredLocations: ["Bengaluru"]
          }
        });

      expect([200, 201]).toContain(createRes.status);
      const newListingId = createRes.body.data.id;

      // Inspect SQLite table to verify images column is populated with JSON array
      const dbRow = db.prepare("SELECT imageUrl, images FROM listings WHERE id = ?").get(newListingId) as any;
      expect(dbRow.imageUrl).toBeDefined();
      expect(dbRow.images).toBeDefined();

      const parsedImages = JSON.parse(dbRow.images);
      expect(Array.isArray(parsedImages)).toBe(true);
      expect(parsedImages.length).toBeGreaterThanOrEqual(3);

      // Clean up test listing
      db.prepare("DELETE FROM listings WHERE id = ?").run(newListingId);
      db.prepare("DELETE FROM exchange_requirements WHERE listingId = ?").run(newListingId);
    });
  });
});
