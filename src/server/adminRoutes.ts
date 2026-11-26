import { Router, Request, Response } from "express";
import { db, getAllDbListings, getDbListingById, rowToListing, runInTransaction, type DbListingRow } from "./db.js";
import { requireAuth, requireRole, type AuthUser } from "./auth.js";

export const adminRouter = Router();

// Enforce Admin RBAC across all routes in this router
adminRouter.use(requireAuth, requireRole("admin"));

// ==========================================
// 1. Admin Platform Overview Metrics
// ==========================================
adminRouter.get("/metrics", (req: Request, res: Response) => {
  try {
    const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
    const totalOwners = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'owner'").get() as { c: number }).c;
    const totalBrokers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'broker'").get() as { c: number }).c;
    const pendingBrokers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'broker' AND status = 'pending'").get() as { c: number }).c;
    const activeBrokers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'broker' AND status = 'active'").get() as { c: number }).c;

    const totalListings = (db.prepare("SELECT COUNT(*) as c FROM listings").get() as { c: number }).c;
    const awaitingReview = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status IN ('submitted', 'under_review')").get() as { c: number }).c;
    const approvedListings = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status = 'reviewed'").get() as { c: number }).c;
    const rejectedListings = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status = 'rejected'").get() as { c: number }).c;
    const lockedListings = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE locked = 1").get() as { c: number }).c;

    const activeProposals = (db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'proposed'").get() as { c: number }).c;
    const completedTrades = (db.prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'accepted'").get() as { c: number }).c;

    res.json({
      success: true,
      data: {
        users: { totalUsers, totalOwners, totalBrokers, pendingBrokers, activeBrokers },
        listings: { totalListings, awaitingReview, approvedListings, rejectedListings, lockedListings },
        exchanges: { activeProposals, completedTrades }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. User Management
// ==========================================
adminRouter.get("/users", (req: Request, res: Response) => {
  try {
    const { role, status, search } = req.query;
    let query = "SELECT id, name, email, role, status, phone, agency, licenseNumber, jurisdiction, experienceYears, createdAt, updatedAt FROM users WHERE 1=1";
    const params: unknown[] = [];

    if (role && typeof role === "string" && role !== "all") {
      query += " AND role = ?";
      params.push(role);
    }
    if (status && typeof status === "string" && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }
    if (search && typeof search === "string") {
      query += " AND (name LIKE ? OR email LIKE ? OR agency LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    query += " ORDER BY createdAt DESC";
    const users = db.prepare(query).all(...params);

    res.json({ success: true, count: users.length, data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.patch("/users/:id/status", (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id);
    const { status, rejectionReason } = req.body;

    if (!["active", "suspended", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    // Protection: Prevent admin from deactivating themselves
    if (targetId === req.user?.id) {
      return res.status(400).json({ success: false, error: "Administrators cannot change their own status." });
    }

    const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(targetId) as AuthUser | undefined;
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET status = ?, rejectionReason = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, rejectionReason || null, now, targetId);

    // If suspended or rejected, terminate any active sessions
    if (status === "suspended" || status === "rejected") {
      db.prepare("DELETE FROM sessions WHERE userId = ?").run(targetId);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'user', ?, 'admin_change_user_status', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      targetId,
      JSON.stringify({ previousStatus: targetUser.status, newStatus: status, reason: rejectionReason }),
      req.user!.name,
      now
    );

    res.json({
      success: true,
      message: `User ${targetUser.name} status updated to ${status}.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Broker Management & Onboarding Applications
// ==========================================
adminRouter.get("/brokers", (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let query = "SELECT id, name, email, role, status, phone, agency, licenseNumber, jurisdiction, experienceYears, rejectionReason, createdAt, updatedAt FROM users WHERE role = 'broker'";
    const params: unknown[] = [];

    if (status && typeof status === "string" && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, createdAt DESC";
    const brokers = db.prepare(query).all(...params);

    res.json({ success: true, count: brokers.length, data: brokers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.get("/brokers/:id", (req: Request, res: Response) => {
  try {
    const brokerId = String(req.params.id);
    const broker = db.prepare(`
      SELECT id, name, email, role, status, phone, agency, licenseNumber,
             jurisdiction, experienceYears, rejectionReason, createdAt, updatedAt
      FROM users
      WHERE id = ? AND role = 'broker'
    `).get(brokerId) as Record<string, unknown> | undefined;

    if (!broker) {
      return res.status(404).json({ success: false, error: "Broker application not found." });
    }

    const logs = db.prepare(`
      SELECT id, action, details, performedBy, timestamp
      FROM audit_logs
      WHERE entityId = ?
      ORDER BY timestamp DESC
    `).all(brokerId);

    res.json({
      success: true,
      data: {
        ...broker,
        auditLogs: logs
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.post("/brokers/:id/review", (req: Request, res: Response) => {
  try {
    const brokerId = String(req.params.id);
    const { action, rejectionReason } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'approve' or 'reject'." });
    }

    const broker = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'broker'").get(brokerId) as AuthUser | undefined;
    if (!broker) {
      return res.status(404).json({ success: false, error: "Broker application not found." });
    }

    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "active" : "rejected";
    const reason = action === "reject" ? (rejectionReason || "Verification criteria not met") : null;

    db.prepare(`
      UPDATE users SET status = ?, rejectionReason = ?, updatedAt = ?
      WHERE id = ?
    `).run(newStatus, reason, now, brokerId);

    // If rejected, terminate any active sessions for this broker
    if (action === "reject") {
      db.prepare("DELETE FROM sessions WHERE userId = ?").run(brokerId);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'broker', ?, ?, ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      brokerId,
      action === "approve" ? "admin_broker_approve" : "admin_broker_reject",
      JSON.stringify({ reason }),
      req.user!.name,
      now
    );

    res.json({
      success: true,
      message: action === "approve"
        ? `Broker ${broker.name} has been approved and granted active valuation privileges.`
        : `Broker application for ${broker.name} has been rejected.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. Admin Property Review & Valuation Panel
// ==========================================
adminRouter.get("/listings", (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT l.*, 
             r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
    `;
    const params: unknown[] = [];
    if (status && typeof status === "string" && status !== "all") {
      query += " WHERE l.status = ?";
      params.push(status);
    } else {
      query += " WHERE l.status IN ('submitted', 'under_review', 'rejected')";
    }
    query += " ORDER BY l.createdAt DESC";

    const rows = db.prepare(query).all(...params) as unknown as DbListingRow[];
    const listings = rows.map(rowToListing);
    res.json({ success: true, count: listings.length, data: listings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.post("/listings/:id/review", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { action, reviewedValue, internalNotes, rejectionReason } = req.body;

    const existing = getDbListingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    // STRICT SECURITY: Derive reviewer identity from authenticated user! Never trust client body!
    const revId = req.user!.id;
    const revName = req.user!.name;
    const now = new Date().toISOString();

    if (action === "approve") {
      const val = Number(reviewedValue);
      if (!val || Number.isNaN(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          error: "A valid positive broker-reviewed valuation is strictly required for approval."
        });
      }

      runInTransaction(() => {
        db.prepare(`
          UPDATE listings SET
            status = 'reviewed',
            reviewedValue = ?,
            rejectionReason = NULL,
            updatedAt = ?
          WHERE id = ?
        `).run(val, now, id);

        db.prepare(`
          INSERT INTO property_reviews (id, listingId, reviewerId, reviewerName, reviewedValue, internalNotes, action, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
        `).run(`rev-${Date.now()}`, id, revId, revName, val, internalNotes || "Broker physical inspection and guidance value verification complete.", now);

        db.prepare(`
          INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
          VALUES (?, 'listing', ?, 'admin_approve', ?, ?, ?)
        `).run(
          `log-${Date.now()}`,
          id,
          JSON.stringify({ reviewedValue: val, internalNotes }),
          revName,
          now
        );
      });

      const updated = getDbListingById(id);
      return res.json({ success: true, message: `Listing approved with broker-reviewed value of ₹${val.toLocaleString("en-IN")}.`, data: updated });
    }

    if (action === "reject") {
      const reason = rejectionReason || "Valuation or documentation criteria not satisfied.";

      runInTransaction(() => {
        db.prepare(`
          UPDATE listings SET
            status = 'rejected',
            rejectionReason = ?,
            updatedAt = ?
          WHERE id = ?
        `).run(reason, now, id);

        db.prepare(`
          INSERT INTO property_reviews (id, listingId, reviewerId, reviewerName, reviewedValue, internalNotes, action, createdAt)
          VALUES (?, ?, ?, ?, 0, ?, 'rejected', ?)
        `).run(`rev-${Date.now()}`, id, revId, revName, internalNotes || reason, now);

        db.prepare(`
          INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
          VALUES (?, 'listing', ?, 'admin_reject', ?, ?, ?)
        `).run(
          `log-${Date.now()}`,
          id,
          JSON.stringify({ rejectionReason: reason, internalNotes }),
          revName,
          now
        );
      });

      const updated = getDbListingById(id);
      return res.json({ success: true, message: "Listing rejected.", data: updated });
    }

    return res.status(400).json({ success: false, error: "Invalid action. Use 'approve' or 'reject'." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
