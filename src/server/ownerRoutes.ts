import { Router, Request, Response } from "express";
import { db, getAllDbListings, getDbListingById, rowToListing, type DbListingRow } from "./db.js";
import { findMatches } from "../matcher.js";
import { MatchWorkflow } from "../workflow.js";
import { resolveCoordinates } from "../location.js";
import { requireAuth, requireRole } from "./auth.js";
import { getPropertyImages, getPropertyTypeFallback } from "../propertyImages.js";
import type { Listing } from "../types.js";

export const ownerRouter = Router();

// Enforce Owner RBAC across all routes in this router
ownerRouter.use(requireAuth, requireRole("owner"));

// ==========================================
// 1. Owner Overview Dashboard Metrics
// ==========================================
ownerRouter.get("/dashboard/stats", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;

    const myTotalProperties = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE ownerId = ?").get(ownerId) as { c: number }).c;
    const awaitingReview = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE ownerId = ? AND status IN ('submitted', 'under_review')").get(ownerId) as { c: number }).c;
    const approvedProperties = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE ownerId = ? AND status = 'reviewed'").get(ownerId) as { c: number }).c;
    const lockedProperties = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE ownerId = ? AND locked = 1").get(ownerId) as { c: number }).c;

    // Run matching engine for active listings involving this owner
    const allListings = getAllDbListings();
    const allMatches = findMatches(allListings, { radiusKm: 60 });
    const ownerListingIds = new Set(allListings.filter((l) => l.ownerId === ownerId).map((l) => l.id));
    const availableMatches = allMatches.filter((m) => m.listingIds.some((id) => ownerListingIds.has(id)));

    // Proposals involving this owner
    const activeProposals = (db.prepare(`
      SELECT COUNT(DISTINCT m.id) as c
      FROM matches m
      JOIN match_participants p ON m.id = p.matchId
      WHERE p.ownerId = ? AND m.status = 'proposed'
    `).get(ownerId) as { c: number }).c;

    const completedExchanges = (db.prepare(`
      SELECT COUNT(DISTINCT m.id) as c
      FROM matches m
      JOIN match_participants p ON m.id = p.matchId
      WHERE p.ownerId = ? AND m.status = 'accepted'
    `).get(ownerId) as { c: number }).c;

    res.json({
      success: true,
      data: {
        myTotalProperties,
        awaitingReview,
        approvedProperties,
        lockedProperties,
        availableMatchesCount: availableMatches.length,
        activeProposals,
        completedExchanges,
        recentMatches: availableMatches.slice(0, 3)
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Owner's Registered Properties
// ==========================================
ownerRouter.get("/listings", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const rows = db.prepare(`
      SELECT l.*, 
             r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
      WHERE l.ownerId = ?
      ORDER BY l.createdAt DESC
    `).all(ownerId) as unknown as DbListingRow[];

    const listings = rows.map(rowToListing);

    const enrichedListings = listings.map((l) => {
      let activeProposal: any = null;
      if (l.locked) {
        const matchRow = db.prepare(`
          SELECT m.id, m.status, m.partyCount, m.updatedAt,
                 r.decision as myDecision, r.respondedAt,
                 c.status as coordinationStatus
          FROM match_participants p
          JOIN matches m ON p.matchId = m.id
          LEFT JOIN match_responses r ON r.matchId = m.id AND r.listingId = ?
          LEFT JOIN exchange_coordinations c ON c.matchId = m.id
          WHERE p.listingId = ? AND m.status IN ('proposed', 'accepted')
          ORDER BY m.updatedAt DESC LIMIT 1
        `).get(l.id, l.id) as any;

        if (matchRow) {
          let statusLabel = "Awaiting Responses";
          if (matchRow.status === "proposed") {
            if (matchRow.myDecision === "pending" || !matchRow.myDecision) {
              statusLabel = "Awaiting Your Response";
            } else if (matchRow.myDecision === "accepted") {
              statusLabel = "Your Response: Accepted (Awaiting Other Participants)";
            } else if (matchRow.myDecision === "declined") {
              statusLabel = "Exchange Declined";
            }
          } else if (matchRow.status === "accepted") {
            const cStatus = matchRow.coordinationStatus || "awaiting_coordination";
            if (cStatus === "site_visit_scheduled") statusLabel = "Site Visit Scheduled";
            else if (cStatus === "site_visit_pending") statusLabel = "Site Visit Pending";
            else if (cStatus === "coordination_in_progress") statusLabel = "Coordination in Progress";
            else if (cStatus === "legal_review_in_progress" || cStatus === "completed") statusLabel = "Exchange Process in Progress";
            else if (cStatus === "closed") statusLabel = "Closed";
            else statusLabel = "Awaiting Admin Coordination";
          }

          activeProposal = {
            matchId: matchRow.id,
            matchRef: matchRow.id.replace("match-", "EXP-"),
            status: matchRow.status,
            partyCount: matchRow.partyCount,
            myDecision: matchRow.myDecision || "pending",
            respondedAt: matchRow.respondedAt,
            coordinationStatus: matchRow.coordinationStatus || "awaiting_coordination",
            statusLabel
          };
        }
      }
      return {
        ...l,
        activeProposal
      };
    });

    res.json({ success: true, count: enrichedListings.length, data: enrichedListings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Register New Property
// ==========================================
ownerRouter.post("/listings", (req: Request, res: Response) => {
  try {
    const body = req.body;
    const owner = req.user!;

    if (!body.title || !body.propertyType || !body.district || !body.locality || !body.area || !body.ownerDeclaredValue) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory property fields (title, propertyType, district, locality, area, ownerDeclaredValue)."
      });
    }

    const countRow = db.prepare("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    const id = `ASSET-${String(countRow.count + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();

    const gallery = getPropertyImages(body.propertyType, countRow.count + 1, body.images, body.imageUrl);
    const imageUrl = gallery[0] || getPropertyTypeFallback(body.propertyType);

    // Resolve coordinates
    const tempListing: Listing = {
      id,
      ownerId: owner.id,
      ownerName: owner.name,
      category: "real_estate",
      propertyType: body.propertyType,
      district: body.district,
      locality: body.locality,
      area: Number(body.area),
      areaUnit: body.areaUnit || "sq_ft",
      ownerDeclaredValue: Number(body.ownerDeclaredValue),
      status: "submitted",
      locked: false,
      wants: {
        propertyTypes: body.wants?.propertyTypes || [],
        preferredLocations: body.wants?.preferredLocations || []
      }
    };
    const coords = resolveCoordinates(tempListing);

    const intent = body.intent || "swap";
    const askingPrice = body.askingPrice ? Number(body.askingPrice) : (intent === "sell" ? Number(body.ownerDeclaredValue) : null);
    const bedrooms = body.bedrooms ? Number(body.bedrooms) : null;
    const bathrooms = body.bathrooms ? Number(body.bathrooms) : null;

    db.prepare(`
      INSERT INTO listings (
        id, ownerId, ownerName, title, category, propertyType,
        district, taluk, locality, pincode, latitude, longitude,
        area, areaUnit, ownerDeclaredValue, reviewedValue, status,
        rejectionReason, locked, intent, askingPrice, saleDescription,
        bedrooms, bathrooms,
        khataType, surveyNumber, conversionStatus,
        description, imageUrl, images, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, 'real_estate', ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, NULL, 'submitted',
        NULL, 0, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      id,
      owner.id,
      owner.name,
      body.title,
      body.propertyType,
      body.district,
      body.taluk || null,
      body.locality,
      body.pincode || "560001",
      coords?.lat ?? null,
      coords?.lon ?? null,
      Number(body.area),
      body.areaUnit || "sq_ft",
      Number(body.ownerDeclaredValue),
      intent,
      askingPrice,
      body.saleDescription || null,
      bedrooms,
      bathrooms,
      body.khataType || "A-Khata",
      body.surveyNumber || null,
      body.conversionStatus || "DC Converted",
      body.description || null,
      imageUrl,
      JSON.stringify(gallery),
      now,
      now
    );

    // Exchange Requirements
    db.prepare(`
      INSERT INTO exchange_requirements (
        id, listingId, desiredPropertyTypes, preferredDistricts,
        preferredLocalities, minArea, minAreaUnit, maxCashToPay, maxCashToReceive,
        minValue, maxValue, openToCashAdjustment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `req-${id}`,
      id,
      JSON.stringify(body.wants?.propertyTypes || []),
      JSON.stringify(body.wants?.preferredDistricts || [body.district]),
      JSON.stringify(body.wants?.preferredLocations || [body.locality]),
      body.wants?.minArea ? Number(body.wants.minArea) : null,
      body.wants?.minAreaUnit || "sq_ft",
      body.wants?.maxCashToPay ? Number(body.wants.maxCashToPay) : 5000000,
      body.wants?.maxCashToReceive ? Number(body.wants.maxCashToReceive) : 5000000,
      body.wants?.minValue ? Number(body.wants.minValue) : null,
      body.wants?.maxValue ? Number(body.wants.maxValue) : null,
      body.wants?.openToCashAdjustment === false ? 0 : 1
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'listing', ?, 'owner_registered_listing', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      id,
      JSON.stringify({ title: body.title, declaredValue: body.ownerDeclaredValue }),
      owner.name,
      now
    );

    const created = getDbListingById(id);
    res.status(201).json({
      success: true,
      message: "Property listing submitted successfully under review.",
      data: created
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. Update Eligible Listing
// ==========================================
ownerRouter.put("/listings/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const owner = req.user!;
    const existing = getDbListingById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (existing.ownerId !== owner.id) {
      return res.status(403).json({ success: false, error: "You are not authorized to modify this listing." });
    }

    if (existing.locked) {
      return res.status(400).json({
        success: false,
        error: "This listing is locked in an active swap proposal and cannot be edited."
      });
    }

    const { title, description, ownerDeclaredValue, wants } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE listings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        ownerDeclaredValue = COALESCE(?, ownerDeclaredValue),
        updatedAt = ?
      WHERE id = ?
    `).run(
      title ? String(title).trim() : null,
      description ? String(description).trim() : null,
      ownerDeclaredValue ? Number(ownerDeclaredValue) : null,
      now,
      id
    );

    if (wants) {
      db.prepare(`
        UPDATE exchange_requirements SET
          desiredPropertyTypes = COALESCE(?, desiredPropertyTypes),
          preferredLocalities = COALESCE(?, preferredLocalities),
          minArea = COALESCE(?, minArea),
          maxCashToPay = COALESCE(?, maxCashToPay),
          maxCashToReceive = COALESCE(?, maxCashToReceive)
        WHERE listingId = ?
      `).run(
        wants.propertyTypes ? JSON.stringify(wants.propertyTypes) : null,
        wants.preferredLocations ? JSON.stringify(wants.preferredLocations) : null,
        wants.minArea ? Number(wants.minArea) : null,
        wants.maxCashToPay ? Number(wants.maxCashToPay) : null,
        wants.maxCashToReceive ? Number(wants.maxCashToReceive) : null,
        id
      );
    }

    const updated = getDbListingById(id);
    res.json({ success: true, message: "Listing updated successfully.", data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 5. Delete / Withdraw Eligible Listing
// ==========================================
ownerRouter.delete("/listings/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const owner = req.user!;
    const existing = getDbListingById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (existing.ownerId !== owner.id) {
      return res.status(403).json({ success: false, error: "You are not authorized to delete this listing." });
    }

    if (existing.locked) {
      return res.status(400).json({
        success: false,
        error: "This listing is locked in an active swap proposal and cannot be deleted."
      });
    }

    db.prepare("DELETE FROM listings WHERE id = ?").run(id);

    res.json({ success: true, message: `Listing ${id} has been withdrawn successfully.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 6. Discover Relevant Matches Involving Owner
// ==========================================
ownerRouter.get("/matches", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { radiusKm } = req.query;
    const radius = radiusKm ? Number(radiusKm) : 60;

    const allListings = getAllDbListings();
    const matches = findMatches(allListings, { radiusKm: radius });

    const ownerListingIds = new Set(allListings.filter((l) => l.ownerId === ownerId).map((l) => l.id));
    const ownerMatches = matches.filter((m) => m.listingIds.some((id) => ownerListingIds.has(id)));

    res.json({
      success: true,
      count: ownerMatches.length,
      data: ownerMatches
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 7. Owner Accepted Exchanges & Coordination Progress
// ==========================================
ownerRouter.get("/exchanges", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const acceptedMatches = db.prepare(`
      SELECT DISTINCT m.*, c.status as coordinationStatus, c.siteVisitDate, c.siteVisitLocation, c.siteVisitNotes, c.coordinationNotes
      FROM matches m
      JOIN match_participants p ON m.id = p.matchId
      LEFT JOIN exchange_coordinations c ON m.id = c.matchId
      WHERE p.ownerId = ? AND m.status = 'accepted'
      ORDER BY m.updatedAt DESC
    `).all(ownerId) as any[];

    const enriched = acceptedMatches.map((m) => {
      const participants = db.prepare("SELECT * FROM match_participants WHERE matchId = ?").all(m.id) as any[];
      // Privacy: Mask other owners' private details
      const sanitizedParticipants = participants.map((p) => {
        const listing = getDbListingById(p.listingId);
        const isMe = p.ownerId === ownerId;
        return {
          listingId: p.listingId,
          ownerId: isMe ? p.ownerId : undefined,
          ownerName: isMe ? p.ownerName : (p.ownerName || "Verified Participant"),
          isCurrentUser: isMe,
          givesAssetId: p.givesAssetId,
          givesPropertyType: p.givesPropertyType,
          givesValue: p.givesValue,
          receivesAssetId: p.receivesAssetId,
          receivesPropertyType: p.receivesPropertyType,
          receivesValue: p.receivesValue,
          amount: p.amount,
          action: p.action,
          cashDifference: p.cashDifference,
          explanation: p.explanation,
          property: listing ? {
            id: listing.id,
            title: listing.title,
            locality: listing.locality,
            district: listing.district,
            propertyType: listing.propertyType,
            area: listing.area,
            areaUnit: listing.areaUnit,
            reviewedValue: listing.reviewedValue,
            imageUrl: listing.imageUrl,
            images: listing.images
          } : null
        };
      });

      return {
        id: m.id,
        ref: m.id.replace("match-", "EXP-"),
        matchType: m.matchType,
        partyCount: m.partyCount,
        status: m.status,
        coordinationStatus: m.coordinationStatus || "awaiting_coordination",
        siteVisitDate: m.siteVisitDate,
        siteVisitLocation: m.siteVisitLocation,
        siteVisitNotes: m.siteVisitNotes,
        coordinationNotes: m.coordinationNotes,
        totalAbsoluteBoot: m.totalAbsoluteBoot,
        explanation: m.explanation,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        participants: sanitizedParticipants
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 8. Owner Notifications
// ==========================================
ownerRouter.get("/notifications", (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const notifs = db.prepare(`
      SELECT * FROM notifications 
      WHERE (userId = ? OR (userId IS NULL AND role = 'owner'))
      ORDER BY createdAt DESC LIMIT 30
    `).all(ownerId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications 
      WHERE (userId = ? OR (userId IS NULL AND role = 'owner')) AND isRead = 0
    `).get(ownerId) as { c: number }).c;

    res.json({ success: true, count: notifs.length, unreadCount, data: notifs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

ownerRouter.patch("/notifications/:id/read", (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ?").run(id);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
