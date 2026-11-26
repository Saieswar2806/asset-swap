import { Router, Request, Response } from "express";
import { db, getDbListingById, rowToListing, type DbListingRow } from "./db.js";
import { requireAuth } from "./auth.js";
import type { BuyerInquiry } from "../types.js";

export const buyRouter = Router();

// Enforce authentication for all Buy endpoints
buyRouter.use(requireAuth);

// ==========================================
// 1. Explore Properties Listed for Sale
// ==========================================
buyRouter.get("/listings", (req: Request, res: Response) => {
  try {
    const { search, propertyType, district, minPrice, maxPrice, minArea, bedrooms } = req.query;

    let query = `
      SELECT id, ownerId, ownerName, title, category, propertyType,
             district, taluk, locality, pincode, area, areaUnit,
             ownerDeclaredValue, reviewedValue, askingPrice, saleDescription,
             bedrooms, bathrooms, description, imageUrl, images, status, intent,
             isSold, createdAt, updatedAt
      FROM listings
      WHERE status = 'reviewed'
        AND intent IN ('sell', 'both')
        AND (isSold IS NULL OR isSold = 0)
    `;
    const params: unknown[] = [];

    if (propertyType && typeof propertyType === "string") {
      query += " AND propertyType = ?";
      params.push(propertyType);
    }

    if (district && typeof district === "string") {
      query += " AND district = ?";
      params.push(district);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query += " AND COALESCE(askingPrice, reviewedValue, ownerDeclaredValue) >= ?";
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query += " AND COALESCE(askingPrice, reviewedValue, ownerDeclaredValue) <= ?";
      params.push(Number(maxPrice));
    }

    if (minArea && !isNaN(Number(minArea))) {
      query += " AND area >= ?";
      params.push(Number(minArea));
    }

    if (bedrooms && !isNaN(Number(bedrooms))) {
      query += " AND bedrooms >= ?";
      params.push(Number(bedrooms));
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      query += " AND (title LIKE ? OR locality LIKE ? OR district LIKE ? OR description LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    query += " ORDER BY createdAt DESC";

    const rows = db.prepare(query).all(...params) as any[];

    // Sanitize output for buyers (do not expose private owner phone/email or internal notes)
    const listings = rows.map((r) => {
      let gallery: string[] = [];
      if (r.images) {
        try { gallery = JSON.parse(r.images); } catch { gallery = []; }
      }
      return {
        id: r.id,
        title: r.title,
        propertyType: r.propertyType,
        district: r.district,
        taluk: r.taluk,
        locality: r.locality,
        pincode: r.pincode,
        area: r.area,
        areaUnit: r.areaUnit,
        askingPrice: r.askingPrice ?? (r.reviewedValue ?? r.ownerDeclaredValue),
        reviewedValue: r.reviewedValue,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        description: r.description,
        saleDescription: r.saleDescription,
        imageUrl: r.imageUrl,
        images: gallery.length > 0 ? gallery : (r.imageUrl ? [r.imageUrl] : []),
        intent: r.intent,
        isSold: Boolean(r.isSold),
        sellerName: r.ownerName,
        sellerId: r.ownerId,
        createdAt: r.createdAt
      };
    });

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Single Sale Property Details
// ==========================================
buyRouter.get("/listings/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const listing = getDbListingById(id);

    if (!listing) {
      return res.status(404).json({ success: false, error: "Property listing not found." });
    }

    const isAuthorizedStaff = req.user?.role === "admin" || req.user?.role === "broker";
    const isOwner = req.user?.id === listing.ownerId;

    if (listing.status !== "reviewed" || (listing.intent !== "sell" && listing.intent !== "both") || listing.isSold) {
      if (!isAuthorizedStaff && !isOwner) {
        return res.status(404).json({ success: false, error: "Property is not available for purchase." });
      }
    }

    // Safe public payload
    const safeData = {
      id: listing.id,
      title: listing.metadata?.title || listing.locality,
      propertyType: listing.propertyType,
      district: listing.district,
      taluk: listing.metadata?.taluk,
      locality: listing.locality,
      pincode: listing.metadata?.pincode,
      area: listing.area,
      areaUnit: listing.areaUnit,
      askingPrice: listing.askingPrice ?? (listing.reviewedValue ?? listing.ownerDeclaredValue),
      reviewedValue: listing.reviewedValue,
      ownerDeclaredValue: listing.ownerDeclaredValue,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      khataType: listing.metadata?.khataType,
      conversionStatus: listing.metadata?.conversionStatus,
      description: listing.metadata?.description,
      saleDescription: listing.saleDescription,
      imageUrl: listing.metadata?.imageUrl || listing.imageUrl,
      images: listing.images || (listing.imageUrl ? [listing.imageUrl] : []),
      intent: listing.intent || "both",
      isSold: listing.isSold || false,
      sellerName: listing.ownerName,
      sellerId: listing.ownerId,
      createdAt: listing.metadata?.createdAt
    };

    res.json({ success: true, data: safeData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Submit Buyer Inquiry / Express Interest (Privacy-Protected)
// ==========================================
buyRouter.post("/inquiries", (req: Request, res: Response) => {
  try {
    const { listingId, message, offerAmount } = req.body;
    const buyer = req.user!;

    if (!listingId || !message || String(message).trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Listing ID and a message regarding your purchase interest are required."
      });
    }

    const listing = getDbListingById(String(listingId));
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (listing.status !== "reviewed" || (listing.intent !== "sell" && listing.intent !== "both")) {
      return res.status(400).json({
        success: false,
        error: "This property is not currently listed for sale."
      });
    }

    if (listing.ownerId === buyer.id) {
      return res.status(400).json({
        success: false,
        error: "You cannot submit a purchase inquiry on your own property."
      });
    }

    // Prevent duplicate pending purchase interest on same listing by same buyer
    const existingPending = db.prepare(`
      SELECT id FROM buyer_inquiries
      WHERE listingId = ? AND buyerId = ? AND sellerResponse = 'pending' AND coordinationStatus = 'awaiting_seller_response'
      LIMIT 1
    `).get(listing.id, buyer.id) as { id: string } | undefined;

    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending purchase interest for this property."
      });
    }

    const inquiryId = `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    // Derive buyer contact strictly from authenticated account for Admin-only coordination; never expose to seller
    const accountPhone = buyer.phone || null;

    db.prepare(`
      INSERT INTO buyer_inquiries (
        id, listingId, sellerId, buyerId, buyerName, buyerEmail, buyerPhone,
        offerAmount, message, status, sellerResponse, adminStatus, coordinationStatus, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending', 'awaiting_seller_response', ?, ?)
    `).run(
      inquiryId,
      listing.id,
      listing.ownerId!,
      buyer.id,
      buyer.name,
      buyer.email,
      accountPhone,
      offerAmount ? Number(offerAmount) : null,
      String(message).trim(),
      now,
      now
    );

    // Timeline record
    db.prepare(`
      INSERT INTO purchase_coordination_timeline (id, inquiryId, action, notes, performedBy, performedById, createdAt)
      VALUES (?, ?, 'interest_submitted', 'Buyer submitted purchase interest through Asset Swap platform.', ?, ?, ?)
    `).run(`ptime-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, inquiryId, buyer.name, buyer.id, now);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'inquiry', ?, 'buyer_submitted_inquiry', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      inquiryId,
      JSON.stringify({ listingId: listing.id, buyerId: buyer.id, offerAmount }),
      buyer.name,
      now
    );

    // Notify Seller (PRIVACY-SAFE: never include buyer email or phone)
    db.prepare(`
      INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
      VALUES (?, ?, 'owner', 'New Purchase Interest Received', ?, 'info', '/sell', ?, 0, ?)
    `).run(
      `notif-${Date.now()}-s`,
      listing.ownerId!,
      `An interested buyer (${buyer.name}) submitted a purchase interest for "${listing.title || listing.locality}". Respond inside your Sell Portfolio.`,
      inquiryId,
      now
    );

    // Notify Admin
    db.prepare(`
      INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
      VALUES (?, NULL, 'admin', 'New Purchase Interest Submitted', ?, 'purchase_interest', '/admin/dashboard', ?, 0, ?)
    `).run(
      `notif-${Date.now()}-a`,
      `Purchase interest received from ${buyer.name} for "${listing.title || listing.locality}" (Awaiting Seller Response).`,
      inquiryId,
      now
    );

    res.json({
      success: true,
      message: "Your purchase interest has been submitted securely. The Asset Swap team will manage coordination once the seller responds.",
      data: {
        id: inquiryId,
        listingId: listing.id,
        sellerName: listing.ownerName,
        status: "pending",
        sellerResponse: "pending",
        adminStatus: "pending",
        coordinationStatus: "awaiting_seller_response",
        createdAt: now
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. View My Sent Inquiries (Buyer's Requests - Privacy Protected)
// ==========================================
buyRouter.get("/my-inquiries", (req: Request, res: Response) => {
  try {
    const buyerId = req.user!.id;

    const rows = db.prepare(`
      SELECT i.id, i.listingId, i.offerAmount, i.message, i.status,
             i.sellerResponse, i.sellerRespondedAt,
             i.adminStatus, i.adminReviewedAt,
             i.coordinationStatus, i.siteVisitDate, i.siteVisitLocation, i.siteVisitNotes,
             i.createdAt, i.updatedAt,
             l.title as listingTitle,
             l.propertyType as listingPropertyType,
             l.district as listingDistrict,
             l.locality as listingLocality,
             l.askingPrice,
             l.imageUrl as listingImage,
             l.ownerName as sellerName
      FROM buyer_inquiries i
      JOIN listings l ON i.listingId = l.id
      WHERE i.buyerId = ?
      ORDER BY i.createdAt DESC
    `).all(buyerId) as any[];

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
