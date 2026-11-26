import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";
import { apiErrorHandler } from "../src/server/errorHandler.js";
import {
  ApiClientError,
  getContextualErrorMessage,
  parseApiResponseBody,
  sanitizeClientErrorMessage
} from "../src/client/utils/apiError.js";

describe("API Routes, Broker Registration, Admin User Details & Structured Error Handling", () => {
  let adminToken = "";
  let brokerToken = "";
  let ownerToken = "";

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];

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
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.token;
  });

  afterAll(() => {
    for (const lid of createdListingIds) {
      db.prepare("DELETE FROM notifications WHERE entityId = ?").run(lid);
      db.prepare("DELETE FROM audit_logs WHERE entityId = ?").run(lid);
      db.prepare("DELETE FROM property_reviews WHERE listingId = ?").run(lid);
      db.prepare("DELETE FROM exchange_requirements WHERE listingId = ?").run(lid);
      db.prepare("DELETE FROM listings WHERE id = ?").run(lid);
    }
    for (const uid of createdUserIds) {
      db.prepare("DELETE FROM users WHERE id = ?").run(uid);
    }
  });

  describe("1. Broker-Assisted Registration (POST /api/broker/register-owner-property)", () => {
    const uniquePhone = `+91 98111 ${String(Date.now()).slice(-5)}`;

    it("Denies unauthenticated and non-broker requests cleanly with 401/403 JSON", async () => {
      const unauth = await request(app)
        .post("/api/broker/register-owner-property")
        .send({});
      expect(unauth.status).toBe(401);
      expect(unauth.body.success).toBe(false);

      const ownerReq = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({});
      expect(ownerReq.status).toBe(403);
      expect(ownerReq.body.success).toBe(false);

      const adminReq = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(adminReq.status).toBe(403);
      expect(adminReq.body.success).toBe(false);
    });

    it("Rejects invalid or incomplete registration payloads with 400 JSON", async () => {
      const missingOwner = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ property: { title: "Incomplete" } });
      expect(missingOwner.status).toBe(400);
      expect(missingOwner.body.success).toBe(false);

      const negativeArea = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({
          owner: { name: "Test Client", phone: uniquePhone },
          property: {
            title: "Invalid Property",
            propertyType: "plot_site",
            district: "Bengaluru",
            locality: "Yelahanka",
            area: -100,
            ownerDeclaredValue: 9000000
          }
        });
      expect(negativeArea.status).toBe(400);
      expect(negativeArea.body.success).toBe(false);
    });

    it("Persists owner + property on first registration, resolves existing owner without duplicate on second, and enforces self-review lock", async () => {
      const firstRes = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({
          owner: {
            name: "Prakash Gowda",
            phone: uniquePhone,
            preferredContactMethod: "phone"
          },
          consent: {
            status: "consent_provided",
            documentationRef: "MANDATE-ROUTE-FIX-01"
          },
          property: {
            title: "Hebbal Commercial Land Plot",
            propertyType: "plot_site",
            district: "Bengaluru",
            locality: "Hebbal",
            area: 3000,
            areaUnit: "sq_ft",
            ownerDeclaredValue: 18500000
          },
          intent: "swap",
          swapPreferences: {
            desiredPropertyTypes: ["apartment"],
            preferredDistricts: ["Bengaluru"]
          }
        });

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.data.id).toMatch(/^ASSET-/);
      expect(firstRes.body.data.submittedByBrokerId).toBe("broker-001");
      expect(firstRes.body.data.consentStatus).toBe("consent_provided");

      const firstOwnerId = firstRes.body.data.ownerId;
      createdListingIds.push(firstRes.body.data.id);
      createdUserIds.push(firstOwnerId);

      // Register second property for same existing owner phone -> resolves existing owner
      const secondRes = await request(app)
        .post("/api/broker/register-owner-property")
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({
          owner: {
            name: "Prakash Gowda",
            phone: uniquePhone
          },
          consent: {
            status: "pending_consent",
            documentationRef: "MANDATE-ROUTE-FIX-02"
          },
          property: {
            title: "Hebbal Commercial Retail Unit",
            propertyType: "commercial",
            district: "Bengaluru",
            locality: "Hebbal",
            area: 2000,
            areaUnit: "sq_ft",
            ownerDeclaredValue: 21000000
          },
          intent: "sell",
          saleDetails: { askingPrice: 21500000 }
        });

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.data.ownerId).toBe(firstOwnerId);
      createdListingIds.push(secondRes.body.data.id);

      const userCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE phone = ?").get(uniquePhone) as { c: number }).c;
      expect(userCount).toBe(1);

      // Registering broker still cannot self-approve their own submission
      const selfApprove = await request(app)
        .post(`/api/broker/listings/${secondRes.body.data.id}/review`)
        .set("Authorization", `Bearer ${brokerToken}`)
        .send({ action: "approve", reviewedValue: 21000000 });
      expect(selfApprove.status).toBe(403);
    });
  });

  describe("2. Admin User Details API (GET /api/admin/users/:id)", () => {
    it("Enforces Admin authentication and RBAC", async () => {
      const unauth = await request(app).get("/api/admin/users/OWNER-001");
      expect(unauth.status).toBe(401);

      const ownerReq = await request(app)
        .get("/api/admin/users/OWNER-001")
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(ownerReq.status).toBe(403);

      const brokerReq = await request(app)
        .get("/api/admin/users/OWNER-001")
        .set("Authorization", `Bearer ${brokerToken}`);
      expect(brokerReq.status).toBe(403);
    });

    it("Returns full real user record & associated data for valid ID, and structured 404 JSON for missing user", async () => {
      const validRes = await request(app)
        .get("/api/admin/users/OWNER-001")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(validRes.status).toBe(200);
      expect(validRes.body.success).toBe(true);
      expect(validRes.body.data.id).toBe("OWNER-001");
      expect(Array.isArray(validRes.body.data.properties)).toBe(true);
      expect(Array.isArray(validRes.body.data.buyInterests)).toBe(true);
      expect(Array.isArray(validRes.body.data.swapProposals)).toBe(true);

      const missingRes = await request(app)
        .get("/api/admin/users/NONEXISTENT-USER-99999")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(missingRes.status).toBe(404);
      expect(missingRes.headers["content-type"]).toMatch(/application\/json/);
      expect(missingRes.body.success).toBe(false);
      expect(missingRes.body.error.code).toBe("USER_NOT_FOUND");
      expect(missingRes.text).not.toContain("<!DOCTYPE html");
    });
  });

  describe("3. Global Structured API Errors & Health Check", () => {
    it("Keeps /health and /api/health operational", async () => {
      const h1 = await request(app).get("/health");
      expect(h1.status).toBe(200);
      expect(h1.body.status).toBe("healthy");

      const h2 = await request(app).get("/api/health");
      expect(h2.status).toBe(200);
      expect(h2.body.status).toBe("healthy");
    });

    it("Returns structured JSON 404 (never HTML) for unknown GET/POST API endpoints", async () => {
      const getMissing = await request(app).get("/api/nonexistent/route/test");
      expect(getMissing.status).toBe(404);
      expect(getMissing.headers["content-type"]).toMatch(/application\/json/);
      expect(getMissing.body).toEqual({
        success: false,
        error: {
          code: "API_ROUTE_NOT_FOUND",
          message: "The requested API service endpoint is unavailable."
        }
      });
      expect(getMissing.text).not.toContain("<html");

      const postMissing = await request(app)
        .post("/api/nonexistent/route/test")
        .send({ hello: "world" });
      expect(postMissing.status).toBe(404);
      expect(postMissing.headers["content-type"]).toMatch(/application\/json/);
      expect(postMissing.body.error.code).toBe("API_ROUTE_NOT_FOUND");
      expect(postMissing.text).not.toContain("Cannot POST");
    });

    it("Handles malformed JSON payloads gracefully with 400 JSON instead of HTML error page", async () => {
      const badJson = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{bad-json-body:");
      expect(badJson.status).toBe(400);
      expect(badJson.headers["content-type"]).toMatch(/application\/json/);
      expect(badJson.body.success).toBe(false);
      expect(badJson.body.error.code).toBe("MALFORMED_JSON");
      expect(badJson.text).not.toContain("SyntaxError");
    });

    it("Centralized apiErrorHandler strips SQL & stack traces from unhandled errors", () => {
      let statusCaptured = 0;
      let jsonCaptured: any = null;
      const mockRes = {
        headersSent: false,
        status(code: number) {
          statusCaptured = code;
          return this;
        },
        json(payload: any) {
          jsonCaptured = payload;
          return this;
        }
      } as any;

      apiErrorHandler(
        new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: listings.id"),
        { method: "POST", originalUrl: "/api/broker/register-owner-property" } as any,
        mockRes,
        () => {}
      );

      expect(statusCaptured).toBe(500);
      expect(jsonCaptured.success).toBe(false);
      expect(jsonCaptured.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(jsonCaptured.error.message).not.toContain("SQLITE");
      expect(jsonCaptured.error.message).not.toContain("listings.id");
    });
  });

  describe("4. Reusable Frontend Error Handler & HTML Safety", () => {
    it("Never leaks raw Express HTML pages ('Cannot POST /api/...') into UI error messages", () => {
      const expressHtml = "<!DOCTYPE html><html><head><title>Error</title></head><body><pre>Cannot POST /api/broker/register-owner-property</pre></body></html>";
      const { parsed, isHtml } = parseApiResponseBody(expressHtml, "text/html; charset=utf-8");
      expect(isHtml).toBe(true);
      expect(parsed.error.code).toBe("HTML_ERROR_RESPONSE");

      const sanitized = sanitizeClientErrorMessage(expressHtml, 404);
      expect(sanitized).not.toContain("<!DOCTYPE");
      expect(sanitized).not.toContain("Cannot POST");

      const contextual = getContextualErrorMessage(
        new ApiClientError({ message: sanitized, status: 404, code: "HTML_ERROR_RESPONSE" }),
        "We couldn't register the property. Please review your details and try again."
      );
      expect(contextual.message).toBe("We couldn't register the property. Please review your details and try again.");
      expect(contextual.isRetryable).toBe(true);
    });

    it("Normalizes 401, 403, 404, 409, network (0) and 500 statuses to professional messages", () => {
      expect(sanitizeClientErrorMessage("Authentication required.", 401)).toBe("Your session has expired. Please sign in again.");
      expect(sanitizeClientErrorMessage("", 403)).toBe("You don't have permission to perform this action.");
      expect(sanitizeClientErrorMessage("", 404)).toBe("The requested information is unavailable.");
      expect(sanitizeClientErrorMessage("SQLITE_CONSTRAINT: UNIQUE", 500)).toBe("Something went wrong. Please try again later.");
      expect(sanitizeClientErrorMessage("", 0)).toBe("We are unable to connect right now. Please try again.");
    });
  });
});
