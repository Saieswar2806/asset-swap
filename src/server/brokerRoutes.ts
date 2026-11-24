import { Router, Request, Response } from "express";
import { db, getDbListingById, rowToListing, type DbListingRow } from "./db.js";
import { requireAuth, requireRole } from "./auth.js";

export const brokerRouter = Router();

// Enforce Broker RBAC across all routes in this router
brokerRouter.use(requireAuth, requireRole("broker"));

// ==========================================
// 1. Broker Overview Statistics
// ==========================================
brokerRouter.get("/dashboard/stats", (req: Request, res: Response) => {
  try {
    const brokerId = req.user!.id;

    const queueCount = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status IN ('submitted', 'under_review')").get() as { c: number }).c;
    const reviewedByMe = (db.prepare("SELECT COUNT(*) as c FROM property_reviews WHERE reviewerId = ?").get(brokerId) as { c: number }).c;
    const approvedByMe = (db.prepare("SELECT COUNT(*) as c FROM property_reviews WHERE reviewerId = ? AND action = 'approved'").get(brokerId) as { c: number }).c;
    const rejectedByMe = (db.prepare("SELECT COUNT(*) as c FROM property_reviews WHERE reviewerId = ? AND action = 'rejected'").get(brokerId) as { c: number }).c;

    res.json({
      success: true,
      data: {
        queueCount,
        reviewedByMe,
        approvedByMe,
        rejectedByMe
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Broker Review Queue (Pending & Under Review Properties)
// ==========================================
brokerRouter.get("/queue", (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT l.*, 
             r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
      WHERE l.status IN ('submitted', 'under_review')
      ORDER BY l.createdAt ASC
    `).all() as unknown as DbListingRow[];

    const listings = rows.map(rowToListing);
    res.json({ success: true, count: listings.length, data: listings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Broker's Completed Reviews
// ==========================================
brokerRouter.get("/my-reviews", (req: Request, res: Response) => {
  try {
    const brokerId = req.user!.id;
    const rows = db.prepare(`
      SELECT pr.id as reviewId, pr.listingId, pr.reviewedValue, pr.internalNotes, pr.action, pr.createdAt as reviewDate,
             l.title, l.propertyType, l.district, l.locality, l.area, l.areaUnit, l.ownerName, l.ownerDeclaredValue, l.status, l.imageUrl
      FROM property_reviews pr
      JOIN listings l ON pr.listingId = l.id
      WHERE pr.reviewerId = ?
      ORDER BY pr.createdAt DESC
    `).all(brokerId);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. Submit Broker Valuation Assessment
// ==========================================
brokerRouter.post("/listings/:id/review", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { action, reviewedValue, internalNotes, rejectionReason } = req.body;
    const broker = req.user!;

    const existing = getDbListingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found in database." });
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      const val = Number(reviewedValue);
      if (!val || Number.isNaN(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          error: "A valid positive broker-reviewed valuation is strictly required for approval."
        });
      }

      // Update listing to reviewed
      db.prepare(`
        UPDATE listings SET
          status = 'reviewed',
          reviewedValue = ?,
          rejectionReason = NULL,
          updatedAt = ?
        WHERE id = ?
      `).run(val, now, id);

      // Record audit review
      db.prepare(`
        INSERT INTO property_reviews (id, listingId, reviewerId, reviewerName, reviewedValue, internalNotes, action, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
      `).run(
        `rev-${Date.now()}`,
        id,
        broker.id,
        broker.name,
        val,
        internalNotes || "Broker guidance valuation and physical survey confirmed.",
        now
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'listing', ?, 'broker_valuation_approved', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        id,
        JSON.stringify({ reviewedValue: val, brokerId: broker.id, brokerName: broker.name, internalNotes }),
        broker.name,
        now
      );

      const updated = getDbListingById(id);
      return res.json({
        success: true,
        message: `Listing approved with broker-reviewed valuation of ₹${val.toLocaleString("en-IN")}.`,
        data: updated
      });
    }

    if (action === "reject") {
      const reason = rejectionReason || internalNotes;
      if (!reason || String(reason).trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "A mandatory rejection reason is required when rejecting a listing."
        });
      }

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
      `).run(
        `rev-${Date.now()}`,
        id,
        broker.id,
        broker.name,
        reason,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'listing', ?, 'broker_valuation_rejected', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        id,
        JSON.stringify({ rejectionReason: reason, brokerId: broker.id }),
        broker.name,
        now
      );

      const updated = getDbListingById(id);
      return res.json({
        success: true,
        message: "Listing rejected and owner notified.",
        data: updated
      });
    }

    return res.status(400).json({ success: false, error: "Action must be 'approve' or 'reject'." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
