import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/server/index.js";
import { db } from "../src/server/db.js";
import { extractAuthResult } from "../src/client/api.js";

describe("Asset Swap Real Authentication & RBAC Test Suite", () => {
  it("POST /api/auth/login authenticates Admin and returns session with both top-level and nested user/token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify top-level
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.status).toBe("active");
    expect(res.body.token).toBeDefined();

    // Verify nested data format compatibility
    expect(res.body.data).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe("admin");
    expect(res.body.data.token).toBe(res.body.token);

    // Verify session cookie was set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("asset_swap_session=");
  });

  it("POST /api/auth/login authenticates Approved Broker (Kavitha Murthy)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "kavitha.murthy@broker.local", password: "Broker@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("broker");
    expect(res.body.user.status).toBe("active");
    expect(res.body.data.user.email).toBe("kavitha.murthy@broker.local");
  });

  it("POST /api/auth/login authenticates Second Approved Broker (Suresh Rao)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "suresh.rao@broker.local", password: "Broker@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("broker");
    expect(res.body.user.status).toBe("active");
    expect(res.body.data.user.email).toBe("suresh.rao@broker.local");
  });

  it("POST /api/auth/login authenticates Pending Broker (Rajesh Patel) with pending status", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "rajesh.patel@broker.local", password: "Broker@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("broker");
    expect(res.body.user.status).toBe("pending");
  });

  it("POST /api/auth/login authenticates Property Owner (Naveen Hegde)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("owner");
    expect(res.body.user.status).toBe("active");
    expect(res.body.data.user.email).toBe("naveen.hegde@owner.local");
  });

  it("POST /api/auth/login rejects invalid password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "WrongPassword999" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid email");
  });

  it("POST /api/auth/login rejects non-existent email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent.user@random.com", password: "Password@123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/auth/register creates an owner account with status 'active'", async () => {
    const testEmail = `newowner_${Date.now()}@test.local`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Owner Bangalore",
        email: testEmail,
        password: "OwnerPassword@123",
        phone: "+91 99887 76655",
        city: "Bangalore",
        role: "owner"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe("owner");
    expect(res.body.user.status).toBe("active");
  });

  it("POST /api/auth/register rejects duplicate email with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Duplicate Attempt",
        email: "admin@asset-swap.local",
        password: "SomePassword@123"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("already exists");
  });

  it("POST /api/auth/broker-apply creates a broker application in 'pending' status", async () => {
    const brokerEmail = `applicant_broker_${Date.now()}@agency.local`;
    const res = await request(app)
      .post("/api/auth/broker-apply")
      .send({
        name: "Anand Real Estate Advisors",
        email: brokerEmail,
        password: "BrokerPassword@123",
        phone: "+91 98450 11223",
        agency: "Anand Properties Bangalore",
        licenseNumber: "KAR-RERA-BR-2024-9988",
        jurisdiction: "Bangalore Urban & Ramanagara",
        experienceYears: 12
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("broker");
    expect(res.body.user.status).toBe("pending");
  });

  it("RBAC: Owner attempting to access /api/admin/metrics returns 403 Forbidden", async () => {
    // 1. Login as owner
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });

    const ownerToken = loginRes.body.token;

    // 2. Try admin endpoint
    const forbiddenRes = await request(app)
      .get("/api/admin/metrics")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
    expect(forbiddenRes.body.error).toContain("Access restricted to admin");
  });

  it("RBAC: Owner attempting to access broker queue returns 403 Forbidden", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "naveen.hegde@owner.local", password: "Owner@123" });

    const ownerToken = loginRes.body.token;

    const forbiddenRes = await request(app)
      .get("/api/broker/queue")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(forbiddenRes.status).toBe(403);
  });

  it("RBAC: Pending broker is blocked from broker queue until approved", async () => {
    const pendingEmail = `pending_broker_${Date.now()}@test.local`;
    const applyRes = await request(app)
      .post("/api/auth/broker-apply")
      .send({
        name: "Pending Broker Candidate",
        email: pendingEmail,
        password: "BrokerPassword@123",
        phone: "+91 91234 56789",
        agency: "Candidate Realty",
        licenseNumber: `RERA-${Date.now()}`
      });

    const pendingBrokerId = applyRes.body.user.id;

    // Login as pending broker to obtain session token
    const loginPending = await request(app)
      .post("/api/auth/login")
      .send({ email: pendingEmail, password: "BrokerPassword@123" });
    const pendingToken = loginPending.body.token;

    // Attempt to access broker queue while pending -> should be 403
    const queueBefore = await request(app)
      .get("/api/broker/queue")
      .set("Authorization", `Bearer ${pendingToken}`);

    expect(queueBefore.status).toBe(403);
    expect(queueBefore.body.error).toContain("pending");

    // Login as admin
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });
    const adminToken = adminLogin.body.token;

    // Admin approves the broker
    const approveRes = await request(app)
      .post(`/api/admin/brokers/${pendingBrokerId}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "approve" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Now re-login as approved broker and verify queue access
    const brokerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: pendingEmail, password: "BrokerPassword@123" });

    expect(brokerLogin.body.user.status).toBe("active");

    const queueAfter = await request(app)
      .get("/api/broker/queue")
      .set("Authorization", `Bearer ${brokerLogin.body.token}`);

    expect(queueAfter.status).toBe(200);
    expect(queueAfter.body.success).toBe(true);
    expect(Array.isArray(queueAfter.body.data)).toBe(true);
  });

  it("POST /api/auth/logout invalidates the session", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@asset-swap.local", password: "Admin@123" });

    const token = loginRes.body.token;

    // Verify /api/auth/me works
    const meBefore = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meBefore.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Verify /api/auth/me now returns 401
    const meAfter = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meAfter.status).toBe(401);
  });

  describe("Client API Response Extraction Contract", () => {
    it("correctly extracts auth result from top-level response format", () => {
      const mockResponse = {
        success: true,
        message: "Login successful.",
        token: "session-token-123",
        user: {
          id: "admin-001",
          name: "System Admin",
          email: "admin@asset-swap.local",
          role: "admin",
          status: "active"
        }
      };

      const result = extractAuthResult(mockResponse);
      expect(result).toBeDefined();
      expect(result.user.id).toBe("admin-001");
      expect(result.user.role).toBe("admin");
      expect(result.token).toBe("session-token-123");
    });

    it("correctly extracts auth result from nested data response format", () => {
      const mockNestedResponse = {
        success: true,
        data: {
          token: "nested-token-456",
          user: {
            id: "owner-789",
            name: "Naveen Hegde",
            email: "naveen.hegde@owner.local",
            role: "owner",
            status: "active"
          }
        }
      };

      const result = extractAuthResult(mockNestedResponse);
      expect(result).toBeDefined();
      expect(result.user.id).toBe("owner-789");
      expect(result.user.role).toBe("owner");
      expect(result.token).toBe("nested-token-456");
    });

    it("throws descriptive error when response is empty, null or undefined", () => {
      expect(() => extractAuthResult(null)).toThrow("Empty or malformed response");
      expect(() => extractAuthResult(undefined)).toThrow("Empty or malformed response");
      expect(() => extractAuthResult("")).toThrow("Empty or malformed response");
    });

    it("throws descriptive error when user profile is missing or invalid", () => {
      expect(() => extractAuthResult({ success: true, token: "only-token" })).toThrow("Response missing valid user profile");
      expect(() => extractAuthResult({ success: true, data: { token: "only-token" } })).toThrow("Response missing valid user profile");
      expect(() => extractAuthResult({ success: true, user: { name: "Missing ID and Role" } })).toThrow("Response missing valid user profile");
    });
  });

  afterAll(() => {
    try {
      db.prepare("DELETE FROM users WHERE email LIKE 'applicant_broker_%' OR email LIKE 'pending_broker_%'").run();
    } catch {
      // ignore
    }
  });
});
