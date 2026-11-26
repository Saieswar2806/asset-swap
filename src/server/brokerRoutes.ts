import { Router, Request, Response } from "express";
import { db, generateNextListingId, getDbListingById, rowToListing, runInTransaction, type DbListingRow } from "./db.js";
import { requireAuth, requireRole } from "./auth.js";
import { resolveCoordinates } from "../location.js";
import { hashPassword } from "./password.js";
import { getPropertyImages, getPropertyTypeFallback } from "../propertyImages.js";
import { getComparableProperties } from "./comparableEngine.js";
import type { Listing } from "../types.js";

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
    const submittedByMe = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE submittedByBrokerId = ?").get(brokerId) as { c: number }).c;

    res.json({
      success: true,
      data: {
        queueCount,
        reviewedByMe,
        approvedByMe,
        rejectedByMe,
        submittedByMe
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
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive,
             r.minValue, r.maxValue, r.openToCashAdjustment
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
      SELECT pr.id as reviewId, pr.listingId, pr.reviewedValue, pr.internalNotes,
             pr.selectedComparableIds, pr.action, pr.createdAt as reviewDate,
             l.title, l.propertyType, l.district, l.locality, l.area, l.areaUnit,
             l.ownerName, l.ownerDeclaredValue, l.status, l.imageUrl
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
// 4. Comparable Properties Recommendation for Valuation Support
// ==========================================
brokerRouter.get("/listings/:id/comparables", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const listing = getDbListingById(id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found in database." });
    }

    const broker = req.user!;
    const result = getComparableProperties(listing, broker.jurisdiction);

    res.json({
      success: true,
      ...result
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 5. Submit Broker Valuation Assessment
// ==========================================
brokerRouter.post("/listings/:id/review", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { action, reviewedValue, internalNotes, rejectionReason, selectedComparableIds } = req.body;
    const broker = req.user!;

    const existing = getDbListingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found in database." });
    }

    // POLICY: A broker cannot approve/review their own assisted registration
    if (existing.submittedByBrokerId && existing.submittedByBrokerId === broker.id) {
      return res.status(403).json({
        success: false,
        error: "Brokers are prohibited from reviewing or approving their own assisted property registrations. An independent broker or administrator must conduct this valuation assessment."
      });
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // POLICY: Consent enforcement
      if (existing.consentStatus === "pending_consent") {
        return res.status(400).json({
          success: false,
          error: "Cannot approve property valuation while owner authorization status is pending. Documented owner consent is required before approval."
        });
      }

      const val = Number(reviewedValue);
      if (!val || Number.isNaN(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          error: "A valid positive broker-reviewed valuation is strictly required for approval."
        });
      }

      const comparablesJson = Array.isArray(selectedComparableIds) && selectedComparableIds.length > 0
        ? JSON.stringify(selectedComparableIds)
        : null;

      runInTransaction(() => {
        // Update listing to reviewed
        db.prepare(`
          UPDATE listings SET
            status = 'reviewed',
            reviewedValue = ?,
            rejectionReason = NULL,
            updatedAt = ?
          WHERE id = ?
        `).run(val, now, id);

        // Record audit review with comparable references
        db.prepare(`
          INSERT INTO property_reviews (
            id, listingId, reviewerId, reviewerName, reviewedValue,
            internalNotes, selectedComparableIds, action, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)
        `).run(
          `rev-${Date.now()}`,
          id,
          broker.id,
          broker.name,
          val,
          internalNotes || "Broker guidance valuation and physical survey confirmed.",
          comparablesJson,
          now
        );

        // Audit log
        db.prepare(`
          INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
          VALUES (?, 'listing', ?, 'broker_valuation_approved', ?, ?, ?)
        `).run(
          `log-${Date.now()}`,
          id,
          JSON.stringify({
            reviewedValue: val,
            brokerId: broker.id,
            brokerName: broker.name,
            internalNotes,
            selectedComparableIds: selectedComparableIds || []
          }),
          broker.name,
          now
        );

        // Notify owner if an account exists
        if (existing.ownerId) {
          db.prepare(`
            INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
            VALUES (?, ?, 'owner', ?, ?, 'success', ?, ?, 0, ?)
          `).run(
            `notif-${Date.now()}`,
            existing.ownerId,
            "Property Valuation Approved",
            `Broker ${broker.name} has approved your property "${existing.title}" with an assessed valuation of ₹${val.toLocaleString("en-IN")}.`,
            `/my-properties`,
            id,
            now
          );
        }
      });

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

      runInTransaction(() => {
        db.prepare(`
          UPDATE listings SET
            status = 'rejected',
            rejectionReason = ?,
            updatedAt = ?
          WHERE id = ?
        `).run(reason, now, id);

        db.prepare(`
          INSERT INTO property_reviews (
            id, listingId, reviewerId, reviewerName, reviewedValue,
            internalNotes, selectedComparableIds, action, createdAt
          ) VALUES (?, ?, ?, ?, 0, ?, NULL, 'rejected', ?)
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

        // Notify owner if exists
        if (existing.ownerId) {
          db.prepare(`
            INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
            VALUES (?, ?, 'owner', ?, ?, 'warning', ?, ?, 0, ?)
          `).run(
            `notif-${Date.now()}`,
            existing.ownerId,
            "Property Listing Needs Revision",
            `Your property listing "${existing.title}" was not approved: ${reason}. Please update your documentation.`,
            `/my-properties`,
            id,
            now
          );
        }
      });

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

// ==========================================
// 6. Broker-Assisted Property Registration
// ==========================================
brokerRouter.post("/register-owner-property", (req: Request, res: Response) => {
  try {
    const broker = req.user!;
    const { owner, property, intent = "swap", consent, swapPreferences, saleDetails } = req.body;

    if (!owner?.name || !owner?.phone) {
      return res.status(400).json({
        success: false,
        error: "Owner full name and phone number are required for broker-assisted registration."
      });
    }

    if (
      !property?.title ||
      !property?.propertyType ||
      !property?.district ||
      !property?.locality ||
      !property?.area ||
      !property?.ownerDeclaredValue ||
      Number(property.area) <= 0 ||
      Number(property.ownerDeclaredValue) <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid property fields (title, propertyType, district, locality, positive area, positive ownerDeclaredValue) are required."
      });
    }

    const cleanPhone = String(owner.phone).trim();
    const cleanEmail = owner.email && String(owner.email).trim().length > 0
      ? String(owner.email).trim().toLowerCase()
      : null;
    const cleanName = String(owner.name).trim();

    // 1. Resolve owner account (match existing by phone or email, do not create duplicate accounts)
    let resolvedOwner = db.prepare(`
      SELECT * FROM users
      WHERE role = 'owner' AND (phone = ? OR (email IS NOT NULL AND email = ?))
      LIMIT 1
    `).get(cleanPhone, cleanEmail || "__none__") as any;

    const now = new Date().toISOString();

    if (!resolvedOwner) {
      // Create new owner account with active status and temporary hashed password
      const countOwners = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'owner'").get() as { c: number }).c;
      const newOwnerId = `OWNER-B-${String(countOwners + 1).padStart(4, "0")}`;
      const defaultEmail = cleanEmail || `owner.${newOwnerId.toLowerCase()}@client.asset-swap.local`;
      const tempHash = hashPassword("Owner@123");

      db.prepare(`
        INSERT INTO users (
          id, name, email, passwordHash, role, status, phone,
          jurisdiction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?, ?, ?)
      `).run(
        newOwnerId,
        cleanName,
        defaultEmail,
        tempHash,
        cleanPhone,
        property.district,
        now,
        now
      );

      resolvedOwner = {
        id: newOwnerId,
        name: cleanName,
        email: defaultEmail,
        phone: cleanPhone
      };
    }

    // 2. Resolve unique Property ID & Images
    const id = generateNextListingId();
    const numericSuffix = parseInt(id.replace(/\D/g, ""), 10) || Date.now();
    const gallery = getPropertyImages(property.propertyType, numericSuffix, property.images, property.imageUrl);
    const imageUrl = gallery[0] || getPropertyTypeFallback(property.propertyType);

    // 3. Resolve Coordinates
    const tempListing: Listing = {
      id,
      ownerId: resolvedOwner.id,
      ownerName: resolvedOwner.name,
      category: "real_estate",
      propertyType: property.propertyType,
      district: property.district,
      locality: property.locality,
      area: Number(property.area),
      areaUnit: property.areaUnit || "sq_ft",
      ownerDeclaredValue: Number(property.ownerDeclaredValue),
      status: "submitted",
      locked: false,
      wants: {
        propertyTypes: swapPreferences?.desiredPropertyTypes || [],
        preferredLocations: swapPreferences?.preferredLocalities || []
      }
    };
    const coords = resolveCoordinates(tempListing);

    const validIntent = intent === "sell" ? "sell" : "swap";
    const askingPrice = validIntent === "sell"
      ? (saleDetails?.askingPrice ? Number(saleDetails.askingPrice) : Number(property.ownerDeclaredValue))
      : null;
    const saleDescription = validIntent === "sell" ? (saleDetails?.saleDescription || null) : null;
    const bedrooms = property.bedrooms ? Number(property.bedrooms) : null;
    const bathrooms = property.bathrooms ? Number(property.bathrooms) : null;

    const consentStatus = consent?.status || "consent_provided";
    const consentDocRef = consent?.documentationRef || null;
    const preferredContact = owner.preferredContactMethod || "phone";

    runInTransaction(() => {
      db.prepare(`
        INSERT INTO listings (
          id, ownerId, ownerName, title, category, propertyType,
          district, taluk, locality, pincode, latitude, longitude,
          area, areaUnit, ownerDeclaredValue, reviewedValue, status,
          rejectionReason, locked, intent, askingPrice, saleDescription,
          bedrooms, bathrooms,
          khataType, surveyNumber, conversionStatus,
          description, imageUrl, images,
          submittedByBrokerId, submittedByBrokerName,
          consentStatus, consentDocumentationRef,
          ownerPhone, ownerEmail, preferredContactMethod,
          createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, 'real_estate', ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, NULL, 'submitted',
          NULL, 0, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `).run(
        id,
        resolvedOwner.id,
        resolvedOwner.name,
        property.title,
        property.propertyType,
        property.district,
        property.taluk || null,
        property.locality,
        property.pincode || "560001",
        coords?.lat ?? null,
        coords?.lon ?? null,
        Number(property.area),
        property.areaUnit || "sq_ft",
        Number(property.ownerDeclaredValue),
        validIntent,
        askingPrice,
        saleDescription,
        bedrooms,
        bathrooms,
        property.khataType || "A-Khata",
        property.surveyNumber || null,
        property.conversionStatus || "DC Converted",
        property.description || null,
        imageUrl,
        JSON.stringify(gallery),
        broker.id,
        broker.name,
        consentStatus,
        consentDocRef,
        cleanPhone,
        cleanEmail,
        preferredContact,
        now,
        now
      );

      // If Swap: Insert Exchange Requirements
      if (validIntent === "swap") {
        db.prepare(`
          INSERT INTO exchange_requirements (
            id, listingId, desiredPropertyTypes, preferredDistricts,
            preferredLocalities, minArea, minAreaUnit, maxCashToPay, maxCashToReceive,
            minValue, maxValue, openToCashAdjustment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `req-${id}`,
          id,
          JSON.stringify(swapPreferences?.desiredPropertyTypes || []),
          JSON.stringify(swapPreferences?.preferredDistricts || [property.district]),
          JSON.stringify(swapPreferences?.preferredLocalities || [property.locality]),
          swapPreferences?.minArea ? Number(swapPreferences.minArea) : null,
          swapPreferences?.minAreaUnit || "sq_ft",
          swapPreferences?.maxCashToPay ? Number(swapPreferences.maxCashToPay) : 5000000,
          swapPreferences?.maxCashToReceive ? Number(swapPreferences.maxCashToReceive) : 5000000,
          swapPreferences?.minValue ? Number(swapPreferences.minValue) : null,
          swapPreferences?.maxValue ? Number(swapPreferences.maxValue) : null,
          swapPreferences?.openToCashAdjustment === false ? 0 : 1
        );
      }

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'listing', ?, 'broker_assisted_property_registration', ?, ?, ?)
      `).run(
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id,
        JSON.stringify({
          brokerId: broker.id,
          brokerName: broker.name,
          ownerId: resolvedOwner.id,
          ownerName: resolvedOwner.name,
          intent: validIntent,
          consentStatus,
          consentDocumentationRef: consentDocRef
        }),
        broker.name,
        now
      );

      // Admin notification for oversight
      db.prepare(`
        INSERT INTO notifications (id, userId, role, title, message, type, link, entityId, isRead, createdAt)
        VALUES (?, NULL, 'admin', ?, ?, 'info', ?, ?, 0, ?)
      `).run(
        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        `Broker Registration (${validIntent.toUpperCase()}): ${property.title}`,
        `Broker ${broker.name} registered property "${property.title}" on behalf of owner ${resolvedOwner.name} [Consent: ${consentStatus}].`,
        `/admin`,
        id,
        now
      );
    });

    const created = getDbListingById(id);
    return res.status(201).json({
      success: true,
      message: `Property registered successfully on behalf of ${resolvedOwner.name}. Transaction intention: ${validIntent.toUpperCase()}.`,
      data: created
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 7. Broker's Submitted Properties (My Submissions)
// ==========================================
brokerRouter.get("/my-submissions", (req: Request, res: Response) => {
  try {
    const brokerId = req.user!.id;
    const rows = db.prepare(`
      SELECT l.*,
             r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive,
             r.minValue, r.maxValue, r.openToCashAdjustment
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
      WHERE l.submittedByBrokerId = ?
      ORDER BY l.createdAt DESC
    `).all(brokerId) as unknown as DbListingRow[];

    const listings = rows.map(rowToListing);
    res.json({ success: true, count: listings.length, data: listings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 8. Update / Resubmit Broker's Submitted Property
// ==========================================
brokerRouter.patch("/my-submissions/:id", (req: Request, res: Response) => {
  try {
    const brokerId = req.user!.id;
    const id = String(req.params.id);
    const existing = getDbListingById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (existing.submittedByBrokerId !== brokerId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify properties submitted by another broker."
      });
    }

    if (existing.status !== "submitted" && existing.status !== "rejected") {
      return res.status(400).json({
        success: false,
        error: "Only properties in 'submitted' or 'rejected' status can be modified or resubmitted."
      });
    }

    const {
      title,
      description,
      ownerDeclaredValue,
      askingPrice,
      consentStatus,
      consentDocumentationRef,
      resubmit
    } = req.body;

    const now = new Date().toISOString();
    const newStatus = resubmit ? "submitted" : existing.status;

    db.prepare(`
      UPDATE listings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        ownerDeclaredValue = COALESCE(?, ownerDeclaredValue),
        askingPrice = COALESCE(?, askingPrice),
        consentStatus = COALESCE(?, consentStatus),
        consentDocumentationRef = COALESCE(?, consentDocumentationRef),
        status = ?,
        rejectionReason = CASE WHEN ? = 'submitted' THEN NULL ELSE rejectionReason END,
        updatedAt = ?
      WHERE id = ?
    `).run(
      title || null,
      description || null,
      ownerDeclaredValue ? Number(ownerDeclaredValue) : null,
      askingPrice ? Number(askingPrice) : null,
      consentStatus || null,
      consentDocumentationRef || null,
      newStatus,
      newStatus,
      now,
      id
    );

    const updated = getDbListingById(id);
    res.json({
      success: true,
      message: resubmit ? "Property resubmitted for valuation review." : "Property details updated successfully.",
      data: updated
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
