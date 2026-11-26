import { Router, Request, Response } from "express";
import { db, getDbListingById, rowToListing, type DbListingRow } from "./db.js";
import { requireAuth, requireRole } from "./auth.js";

export const sellRouter = Router();

// Enforce authentication & owner/admin role for Sell endpoints
sellRouter.use(requireAuth, requireRole("owner", "admin"));

// ==========================================
// 1. My Properties Listed For Sale
// ==========================================
sellRouter.get("/listings", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;

    const rows = db.prepare(`
      SELECT l.*,
             (SELECT COUNT(*) FROM buyer_inquiries WHERE listingId = l.id) as inquiryCount
      FROM listings l
      WHERE l.ownerId = ?
        AND l.intent IN ('sell', 'both')
      ORDER BY l.createdAt DESC
    `).all(ownerId) as any[];

    const data = rows.map((r) => ({
      ...rowToListing(r as unknown as DbListingRow),
      inquiryCount: r.inquiryCount || 0
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Enable Sale on an Existing Owned Property
// ==========================================
sellRouter.post("/enable", (req: Request, res: Response) => {
  try {
    const { listingId, askingPrice, saleDescription, intent = "both" } = req.body;
    const ownerId = req.user!.id;

    if (!listingId || !askingPrice || Number(askingPrice) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid listing ID and positive asking price are required."
      });
    }

    const listing = getDbListingById(String(listingId));
    if (!listing) {
      return res.status(404).json({ success: false, error: "Property listing not found." });
    }

    if (listing.ownerId !== ownerId && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "You can only list properties that you own for sale."
      });
    }

    const validIntent = intent === "sell" ? "sell" : "both";
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE listings
      SET intent = ?,
          askingPrice = ?,
          saleDescription = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      validIntent,
      Number(askingPrice),
      saleDescription ? String(saleDescription).trim() : null,
      now,
      listing.id
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'listing', ?, 'owner_enabled_sale', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      listing.id,
      JSON.stringify({ askingPrice, intent: validIntent }),
      req.user!.name,
      now
    );

    res.json({
      success: true,
      message: `Property successfully listed for ${validIntent === "both" ? "Swap & Sale" : "Direct Sale"}.`,
      data: {
        listingId: listing.id,
        intent: validIntent,
        askingPrice: Number(askingPrice),
        updatedAt: now
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Update Sale Terms or Deactivate Sale
// ==========================================
sellRouter.patch("/listings/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { askingPrice, saleDescription, intent, isSold } = req.body;
    const ownerId = req.user!.id;

    const listing = getDbListingById(id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Property listing not found." });
    }

    if (listing.ownerId !== ownerId && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify this property listing."
      });
    }

    const updates: string[] = ["updatedAt = ?"];
    const params: unknown[] = [new Date().toISOString()];

    if (askingPrice !== undefined && Number(askingPrice) > 0) {
      updates.push("askingPrice = ?");
      params.push(Number(askingPrice));
    }

    if (saleDescription !== undefined) {
      updates.push("saleDescription = ?");
      params.push(saleDescription ? String(saleDescription).trim() : null);
    }

    if (intent && ["swap", "sell", "both"].includes(intent)) {
      updates.push("intent = ?");
      params.push(intent);
    }

    if (isSold !== undefined) {
      updates.push("isSold = ?");
      params.push(isSold ? 1 : 0);
    }

    params.push(id);

    db.prepare(`UPDATE listings SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    res.json({
      success: true,
      message: "Sale listing terms updated successfully."
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Mark property as Sold
sellRouter.patch("/listings/:id/sold", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const ownerId = req.user!.id;

    const listing = getDbListingById(id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Property listing not found." });
    }

    if (listing.ownerId !== ownerId && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to mark this property as sold."
      });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE listings SET isSold = 1, updatedAt = ? WHERE id = ?").run(now, id);

    res.json({
      success: true,
      message: "Property successfully marked as sold."
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Deactivate Sale Listing (revert to Swap-only)
sellRouter.patch("/listings/:id/deactivate", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const ownerId = req.user!.id;

    const listing = getDbListingById(id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Property listing not found." });
    }

    if (listing.ownerId !== ownerId && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to deactivate this sale listing."
      });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE listings SET intent = 'swap', updatedAt = ? WHERE id = ?").run(now, id);

    res.json({
      success: true,
      message: "Property sale listing deactivated and reverted to swap-only."
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. Inquiries Received from Buyers (STRICTLY PRIVACY-PROTECTED)
// ==========================================
sellRouter.get("/inquiries", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;

    // PRIVACY RULE: Never select or expose buyerEmail, buyerPhone, or buyerId to the seller!
    const rows = db.prepare(`
      SELECT i.id, i.listingId, i.sellerId, i.buyerName, i.offerAmount, i.message,
             i.status, i.sellerResponse, i.sellerRespondedAt, i.sellerNotes,
             i.adminStatus, i.adminReviewedAt, i.coordinationStatus,
             i.siteVisitDate, i.siteVisitLocation, i.siteVisitNotes,
             i.createdAt, i.updatedAt,
             l.title as listingTitle,
             l.propertyType as listingPropertyType,
             l.district as listingDistrict,
             l.locality as listingLocality,
             l.askingPrice,
             l.imageUrl as listingImage
      FROM buyer_inquiries i
      JOIN listings l ON i.listingId = l.id
      WHERE i.sellerId = ?
      ORDER BY i.createdAt DESC
    `).all(ownerId) as any[];

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// Shared Seller Response handler
function handleSellerInquiryResponse(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { status, decision, notes } = req.body;
    const ownerId = req.user!.id;

    const inquiry = db.prepare("SELECT * FROM buyer_inquiries WHERE id = ?").get(id) as any;
    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found." });
    }

    if (inquiry.sellerId !== ownerId && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to manage inquiries for this property."
      });
    }

    // Normalize intent: support explicit decision ('accepted' | 'declined') and status ('pending' | 'contacted' | 'closed' | 'accepted' | 'declined')
    const rawChoice = decision || status;
    if (!["pending", "contacted", "closed", "accepted", "declined"].includes(rawChoice)) {
      return res.status(400).json({
        success: false,
        error: "Invalid decision or status. Must be accepted, declined, pending, contacted, or closed."
      });
    }

    const now = new Date().toISOString();
    const listing = getDbListingById(inquiry.listingId);
    const listingLabel = listing?.title || inquiry.listingId;

    if (rawChoice === "accepted" || rawChoice === "contacted") {
      const legacyStatus = "contacted";
      db.prepare(`
        UPDATE buyer_inquiries
        SET status = ?,
            sellerResponse = 'accepted',
            sellerRespondedAt = ?,
            sellerNotes = COALESCE(?, sellerNotes),
            coordinationStatus = CASE
              WHEN adminStatus = 'approved_for_coordination' THEN coordinationStatus
              ELSE 'awaiting_admin_review'
            END,
            updatedAt = ?
        WHERE id = ?
      `).run(legacyStatus, now, notes ? String(notes).trim() : null, now, id);

      db.prepare(`
        INSERT INTO purchase_coordination_timeline (id, inquiryId, action, notes, performedBy, performedById, createdAt)
        VALUES (?, ?, 'seller_accepted_interest', ?, ?, ?, ?)
      `).run(
        `ptime-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id,
        notes ? `Seller accepted interest: ${String(notes).trim()}` : "Seller agreed to proceed with purchase interest. Flagged for Admin review.",
        req.user!.name,
        req.user!.id,
        now
      );

      db.prepare(`
        INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
        VALUES (?, NULL, 'admin', 'Mutual Purchase Interest Awaiting Review', ?, 'purchase_interest_review', '/admin/dashboard', ?, 0, ?)
      `).run(
        `notif-${Date.now()}-adm`,
        `Seller accepted purchase interest for "${listingLabel}" (Buyer: ${inquiry.buyerName}). Review to approve Asset Swap coordination.`,
        id,
        now
      );

      db.prepare(`
        INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
        VALUES (?, ?, 'owner', 'Seller Accepted Your Purchase Interest', ?, 'success', '/buy', ?, 0, ?)
      `).run(
        `notif-${Date.now()}-buy`,
        inquiry.buyerId,
        `The property owner accepted your purchase interest for "${listingLabel}". Asset Swap administration will now review and initiate coordination.`,
        id,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'inquiry', ?, 'seller_accepted_purchase_interest', ?, ?, ?)
      `).run(`log-${Date.now()}`, id, JSON.stringify({ listingId: inquiry.listingId, notes }), req.user!.name, now);

      return res.json({
        success: true,
        message: "Interest accepted. This mutual purchase interest has been forwarded to Asset Swap administration for coordination.",
        data: {
          id,
          status: legacyStatus,
          sellerResponse: "accepted",
          adminStatus: inquiry.adminStatus,
          coordinationStatus: "awaiting_admin_review",
          updatedAt: now
        }
      });
    }

    if (rawChoice === "declined" || rawChoice === "closed") {
      const legacyStatus = "closed";
      const newCoordStatus = rawChoice === "declined" ? "declined" : "closed";
      db.prepare(`
        UPDATE buyer_inquiries
        SET status = ?,
            sellerResponse = 'declined',
            sellerRespondedAt = ?,
            sellerNotes = COALESCE(?, sellerNotes),
            coordinationStatus = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(legacyStatus, now, notes ? String(notes).trim() : null, newCoordStatus, now, id);

      db.prepare(`
        INSERT INTO purchase_coordination_timeline (id, inquiryId, action, notes, performedBy, performedById, createdAt)
        VALUES (?, ?, 'seller_declined_interest', ?, ?, ?, ?)
      `).run(
        `ptime-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id,
        notes ? `Seller declined interest: ${String(notes).trim()}` : "Seller declined the purchase inquiry.",
        req.user!.name,
        req.user!.id,
        now
      );

      db.prepare(`
        INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
        VALUES (?, ?, 'owner', 'Purchase Interest Update', ?, 'info', '/buy', ?, 0, ?)
      `).run(
        `notif-${Date.now()}-buy`,
        inquiry.buyerId,
        `Your purchase interest for "${listingLabel}" was declined by the property owner.`,
        id,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'inquiry', ?, 'seller_declined_purchase_interest', ?, ?, ?)
      `).run(`log-${Date.now()}`, id, JSON.stringify({ listingId: inquiry.listingId, notes }), req.user!.name, now);

      return res.json({
        success: true,
        message: "Purchase interest declined.",
        data: {
          id,
          status: legacyStatus,
          sellerResponse: "declined",
          coordinationStatus: newCoordStatus,
          updatedAt: now
        }
      });
    }

    db.prepare("UPDATE buyer_inquiries SET status = ?, updatedAt = ? WHERE id = ?").run(rawChoice, now, id);
    return res.json({
      success: true,
      message: `Inquiry status updated to ${rawChoice}.`,
      data: { id, status: rawChoice, updatedAt: now }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
}

// ==========================================
// 5. Seller Actions on Purchase Interest
// ==========================================
sellRouter.patch("/inquiries/:id/status", handleSellerInquiryResponse);
sellRouter.post("/inquiries/:id/respond", handleSellerInquiryResponse);
