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
    const awaitingCoordination = (db.prepare("SELECT COUNT(*) as c FROM exchange_coordinations WHERE status IN ('awaiting_coordination', 'coordination_in_progress', 'site_visit_pending')").get() as { c: number })?.c || 0;
    const unreadNotifications = (db.prepare("SELECT COUNT(*) as c FROM notifications WHERE role = 'admin' AND isRead = 0").get() as { c: number })?.c || 0;

    res.json({
      success: true,
      data: {
        users: { totalUsers, totalOwners, totalBrokers, pendingBrokers, activeBrokers },
        listings: { totalListings, awaitingReview, approvedListings, rejectedListings, lockedListings },
        exchanges: { activeProposals, completedTrades, awaitingCoordination, unreadNotifications }
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

adminRouter.patch("/listings/:id/consent", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { consentStatus, consentDocumentationRef } = req.body;
    if (!["pending_consent", "consent_provided", "verified_by_owner"].includes(consentStatus)) {
      return res.status(400).json({ success: false, error: "Invalid consentStatus value." });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE listings SET
        consentStatus = ?,
        consentDocumentationRef = COALESCE(?, consentDocumentationRef),
        updatedAt = ?
      WHERE id = ?
    `).run(consentStatus, consentDocumentationRef || null, now, id);

    const updated = getDbListingById(id);
    res.json({ success: true, message: "Consent status updated by admin.", data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 5. Accepted Exchanges Coordination Management
// ==========================================

// Get all accepted exchanges with coordination details and owner contact info (for staff coordination)
adminRouter.get("/exchanges", (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT m.*, 
             c.id as coordId, c.status as coordinationStatus, 
             c.siteVisitDate, c.siteVisitLocation, c.siteVisitNotes, 
             c.coordinationNotes, c.assignedAdminId, c.assignedAdminName,
             c.updatedAt as coordUpdatedAt
      FROM matches m
      LEFT JOIN exchange_coordinations c ON m.id = c.matchId
      WHERE m.status = 'accepted'
    `;
    const params: unknown[] = [];

    if (status && typeof status === "string" && status !== "all") {
      query += " AND (c.status = ? OR (c.status IS NULL AND ? = 'awaiting_coordination'))";
      params.push(status, status);
    }

    query += " ORDER BY m.updatedAt DESC";

    const rows = db.prepare(query).all(...params) as any[];

    const exchanges = rows.map((row) => {
      // Fetch participants and link owner contact details for administrative contact
      const participants = db.prepare(`
        SELECT p.*, u.email as ownerEmail, u.phone as ownerPhone
        FROM match_participants p
        LEFT JOIN users u ON p.ownerId = u.id
        WHERE p.matchId = ?
      `).all(row.id) as any[];

      const detailedParticipants = participants.map((p) => {
        const listing = getDbListingById(p.listingId);
        return {
          ...p,
          property: listing ? {
            id: listing.id,
            title: listing.title,
            district: listing.district,
            locality: listing.locality,
            propertyType: listing.propertyType,
            area: listing.area,
            areaUnit: listing.areaUnit,
            reviewedValue: listing.reviewedValue,
            ownerDeclaredValue: listing.ownerDeclaredValue,
            status: listing.status,
            imageUrl: listing.imageUrl,
            images: listing.images
          } : null
        };
      });

      // Fetch recent coordination timeline logs
      const timeline = db.prepare(`
        SELECT * FROM coordination_timeline 
        WHERE matchId = ? 
        ORDER BY createdAt DESC LIMIT 10
      `).all(row.id);

      return {
        id: row.id,
        ref: row.id.replace("match-", "EXP-"),
        matchType: row.matchType,
        partyCount: row.partyCount,
        status: row.status,
        coordinationStatus: row.coordinationStatus || "awaiting_coordination",
        totalAbsoluteBoot: row.totalAbsoluteBoot,
        explanation: row.explanation,
        siteVisitDate: row.siteVisitDate || null,
        siteVisitLocation: row.siteVisitLocation || null,
        siteVisitNotes: row.siteVisitNotes || null,
        coordinationNotes: row.coordinationNotes || null,
        assignedAdminName: row.assignedAdminName || null,
        acceptedAt: row.updatedAt,
        participants: detailedParticipants,
        timeline
      };
    });

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      const filtered = exchanges.filter((e) =>
        e.ref.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.explanation.toLowerCase().includes(q) ||
        e.participants.some((p: any) => p.ownerName.toLowerCase().includes(q) || p.ownerEmail?.toLowerCase().includes(q))
      );
      return res.json({ success: true, count: filtered.length, data: filtered });
    }

    res.json({ success: true, count: exchanges.length, data: exchanges });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Update exchange coordination status
adminRouter.patch("/exchanges/:id/status", (req: Request, res: Response) => {
  try {
    const matchId = String(req.params.id);
    const { status, notes } = req.body;

    const validStatuses = [
      "awaiting_coordination",
      "coordination_in_progress",
      "site_visit_pending",
      "site_visit_scheduled",
      "legal_review_in_progress",
      "completed",
      "closed"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid coordination status value." });
    }

    const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as any;
    if (!match) {
      return res.status(404).json({ success: false, error: "Exchange proposal not found." });
    }

    const now = new Date().toISOString();
    const admin = req.user!;

    runInTransaction(() => {
      db.prepare(`
        INSERT INTO exchange_coordinations (id, matchId, status, coordinationNotes, assignedAdminId, assignedAdminName, updatedAt, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(matchId) DO UPDATE SET 
          status = excluded.status,
          coordinationNotes = COALESCE(excluded.coordinationNotes, coordinationNotes),
          assignedAdminId = excluded.assignedAdminId,
          assignedAdminName = excluded.assignedAdminName,
          updatedAt = excluded.updatedAt
      `).run(
        `coord-${matchId}`,
        matchId,
        status,
        notes || null,
        admin.id,
        admin.name,
        now,
        now
      );

      // Record in coordination timeline
      db.prepare(`
        INSERT INTO coordination_timeline (id, matchId, action, notes, performedBy, performedById, createdAt)
        VALUES (?, ?, 'status_update', ?, ?, ?, ?)
      `).run(
        `time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        `Status updated to '${status.replace(/_/g, " ")}'${notes ? `: ${notes}` : ""}`,
        admin.name,
        admin.id,
        now
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'exchange_coordination', ?, 'admin_update_coordination_status', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        matchId,
        JSON.stringify({ newStatus: status, notes, adminName: admin.name }),
        admin.name,
        now
      );
    });

    res.json({
      success: true,
      message: `Coordination status updated to '${status.replace(/_/g, " ")}'.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Schedule or update a site visit
adminRouter.post("/exchanges/:id/site-visit", (req: Request, res: Response) => {
  try {
    const matchId = String(req.params.id);
    const { siteVisitDate, siteVisitLocation, siteVisitNotes } = req.body;

    if (!siteVisitDate) {
      return res.status(400).json({ success: false, error: "Site visit date is required." });
    }

    const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as any;
    if (!match) {
      return res.status(404).json({ success: false, error: "Exchange proposal not found." });
    }

    const now = new Date().toISOString();
    const admin = req.user!;

    runInTransaction(() => {
      db.prepare(`
        INSERT INTO exchange_coordinations (
          id, matchId, status, siteVisitDate, siteVisitLocation, siteVisitNotes, 
          assignedAdminId, assignedAdminName, updatedAt, createdAt
        )
        VALUES (?, ?, 'site_visit_scheduled', ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(matchId) DO UPDATE SET 
          status = 'site_visit_scheduled',
          siteVisitDate = excluded.siteVisitDate,
          siteVisitLocation = excluded.siteVisitLocation,
          siteVisitNotes = excluded.siteVisitNotes,
          assignedAdminId = excluded.assignedAdminId,
          assignedAdminName = excluded.assignedAdminName,
          updatedAt = excluded.updatedAt
      `).run(
        `coord-${matchId}`,
        matchId,
        siteVisitDate,
        siteVisitLocation || "Participating property site inspection",
        siteVisitNotes || null,
        admin.id,
        admin.name,
        now,
        now
      );

      // Record in coordination timeline
      db.prepare(`
        INSERT INTO coordination_timeline (id, matchId, action, notes, performedBy, performedById, createdAt)
        VALUES (?, ?, 'site_visit_scheduled', ?, ?, ?, ?)
      `).run(
        `time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        `Site visit scheduled for ${new Date(siteVisitDate).toLocaleDateString("en-IN")}${siteVisitLocation ? ` at ${siteVisitLocation}` : ""}. Inspection notes: ${siteVisitNotes || "Standard due diligence checklist"}`,
        admin.name,
        admin.id,
        now
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'exchange_coordination', ?, 'admin_schedule_site_visit', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        matchId,
        JSON.stringify({ siteVisitDate, siteVisitLocation, siteVisitNotes }),
        admin.name,
        now
      );

      // Notify participating owners
      const participantRows = db.prepare("SELECT DISTINCT ownerId FROM match_participants WHERE matchId = ?").all(matchId) as any[];
      for (const p of participantRows) {
        db.prepare(`
          INSERT INTO notifications (id, userId, role, title, message, type, entityId, link, createdAt)
          VALUES (?, ?, 'owner', 'Site Visit Inspection Scheduled', ?, 'site_visit_scheduled', ?, '/exchange-progress', ?)
        `).run(
          `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          p.ownerId,
          `A physical site inspection has been scheduled for proposal ${matchId.replace("match-", "EXP-")} on ${new Date(siteVisitDate).toLocaleDateString("en-IN")}.`,
          matchId,
          now
        );
      }
    });

    res.json({
      success: true,
      message: `Site visit scheduled for ${new Date(siteVisitDate).toLocaleDateString("en-IN")}. Participating property owners have been notified.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Add coordination note
adminRouter.post("/exchanges/:id/notes", (req: Request, res: Response) => {
  try {
    const matchId = String(req.params.id);
    const { note } = req.body;

    if (!note || !String(note).trim()) {
      return res.status(400).json({ success: false, error: "Note content is required." });
    }

    const now = new Date().toISOString();
    const admin = req.user!;

    runInTransaction(() => {
      db.prepare(`
        INSERT INTO coordination_timeline (id, matchId, action, notes, performedBy, performedById, createdAt)
        VALUES (?, ?, 'coordination_note', ?, ?, ?, ?)
      `).run(
        `time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        String(note).trim(),
        admin.name,
        admin.id,
        now
      );

      db.prepare(`
        UPDATE exchange_coordinations 
        SET coordinationNotes = ?, updatedAt = ?
        WHERE matchId = ?
      `).run(String(note).trim(), now, matchId);
    });

    res.json({ success: true, message: "Coordination note recorded successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 6. Admin Real Notifications
// ==========================================
adminRouter.get("/notifications", (req: Request, res: Response) => {
  try {
    const notifs = db.prepare(`
      SELECT * FROM notifications 
      WHERE role = 'admin' OR userId = ?
      ORDER BY createdAt DESC LIMIT 50
    `).all(req.user!.id);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications 
      WHERE (role = 'admin' OR userId = ?) AND isRead = 0
    `).get(req.user!.id) as { c: number }).c;

    res.json({ success: true, count: notifs.length, unreadCount, data: notifs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.patch("/notifications/:id/read", (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ?").run(id);
    res.json({ success: true, message: "Notification marked as read." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

adminRouter.patch("/notifications/read-all", (req: Request, res: Response) => {
  try {
    db.prepare("UPDATE notifications SET isRead = 1 WHERE role = 'admin' OR userId = ?").run(req.user!.id);
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
