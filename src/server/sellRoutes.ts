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
    const { askingPrice, saleDescription, intent } = req.body;
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

// ==========================================
// 4. Inquiries Received from Buyers
// ==========================================
sellRouter.get("/inquiries", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;

    const rows = db.prepare(`
      SELECT i.*,
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

// ==========================================
// 5. Update Inquiry Status (Seller Action)
// ==========================================
sellRouter.patch("/inquiries/:id/status", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    const ownerId = req.user!.id;

    if (!["pending", "contacted", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid inquiry status. Must be pending, contacted, or closed."
      });
    }

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

    const now = new Date().toISOString();
    db.prepare("UPDATE buyer_inquiries SET status = ?, updatedAt = ? WHERE id = ?").run(status, now, id);

    res.json({
      success: true,
      message: `Inquiry marked as ${status}.`,
      data: { id, status, updatedAt: now }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
