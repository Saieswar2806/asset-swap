import { Router, Request, Response } from "express";
import { db, getAllDbListings, getDbListingById, rowToListing, runInTransaction, type DbListingRow } from "./db.js";
import { findMatches, eligible } from "../matcher.js";
import { MatchWorkflow } from "../workflow.js";
import { resolveCoordinates } from "../location.js";
import type { Listing, Match, PropertyType, AreaUnit, VerificationStatus } from "../types.js";
import { authRouter } from "./authRoutes.js";
import { adminRouter } from "./adminRoutes.js";
import { brokerRouter } from "./brokerRoutes.js";
import { ownerRouter } from "./ownerRoutes.js";
import { buyRouter } from "./buyRoutes.js";
import { sellRouter } from "./sellRoutes.js";
import { requireAuth, requireRole } from "./auth.js";

export const apiRouter = Router();

// Mount Dedicated Role & Auth Sub-Routers
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/broker", brokerRouter);
apiRouter.use("/owner", ownerRouter);
apiRouter.use("/buy", buyRouter);
apiRouter.use("/sell", sellRouter);

// ==========================================
// 1. User & Demo Role Management (Admin-Protected)
// ==========================================
apiRouter.get("/users", requireAuth, requireRole("admin"), (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, email, role, status, phone, agency, licenseNumber, jurisdiction, experienceYears, createdAt, updatedAt
      FROM users
      ORDER BY role DESC, name ASC
    `).all();
    res.json({ success: true, data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Dashboard Analytics & Statistics
// ==========================================
apiRouter.get("/dashboard/stats", (req: Request, res: Response) => {
  try {
    const isStaff = !!req.user && (req.user.role === "admin" || req.user.role === "broker");

    const totalListings = (db.prepare(
      isStaff
        ? "SELECT COUNT(*) as count FROM listings"
        : "SELECT COUNT(*) as count FROM listings WHERE status = 'reviewed'"
    ).get() as { count: number }).count;

    const awaitingReview = isStaff
      ? (db.prepare("SELECT COUNT(*) as count FROM listings WHERE status IN ('submitted', 'under_review')").get() as { count: number }).count
      : 0;

    const brokerReviewed = (db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'reviewed'").get() as { count: number }).count;

    const rejectedListings = isStaff
      ? (db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'rejected'").get() as { count: number }).count
      : 0;

    // Matches stats
    const activeProposals = (db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'proposed'").get() as { count: number }).count;
    const completedTrades = (db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'accepted'").get() as { count: number }).count;

    // Property Type Distribution
    const statusFilter = isStaff ? "" : "WHERE status = 'reviewed'";
    const typeDistribution = db.prepare(`
      SELECT propertyType as type, COUNT(*) as count, AVG(ownerDeclaredValue) as avgValue
      FROM listings
      ${statusFilter}
      GROUP BY propertyType
      ORDER BY count DESC
    `).all();

    // District Distribution
    const districtDistribution = db.prepare(`
      SELECT district, COUNT(*) as count
      FROM listings
      ${statusFilter}
      GROUP BY district
      ORDER BY count DESC
    `).all();

    // Recent Listings
    const recentWhere = isStaff ? "" : "WHERE l.status = 'reviewed'";
    const recentRows = db.prepare(`
      SELECT l.*, r.desiredPropertyTypes, r.preferredLocalities
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
      ${recentWhere}
      ORDER BY l.createdAt DESC
      LIMIT 6
    `).all() as unknown as DbListingRow[];
    const recentListings = recentRows.map(rowToListing);

    // Compute live available matches count from matching engine
    const activeListings = getAllDbListings();
    const discoveredMatches = findMatches(activeListings, { radiusKm: 60 });
    const availableMatchesCount = discoveredMatches.length;

    // Top recent match recommendations (take top 4)
    const topMatches = discoveredMatches.slice(0, 4);

    // Mock exchange activity data for charts
    const exchangeActivity = [
      { month: "Jun", proposals: 4, completed: 2, volumeCr: 8.5 },
      { month: "Jul", proposals: 7, completed: 4, volumeCr: 15.2 },
      { month: "Aug", proposals: 12, completed: 8, volumeCr: 24.0 },
      { month: "Sep", proposals: 16, completed: 11, volumeCr: 33.5 },
      { month: "Oct", proposals: 22, completed: 15, volumeCr: 45.8 },
      { month: "Nov", proposals: 28, completed: 21, volumeCr: 58.4 }
    ];

    res.json({
      success: true,
      data: {
        totalListings,
        awaitingReview,
        brokerReviewed,
        rejectedListings,
        availableMatchesCount,
        activeProposals,
        completedTrades,
        typeDistribution,
        districtDistribution,
        recentListings,
        recentMatches: topMatches,
        exchangeActivity
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Property Listings (CRUD & Search)
// ==========================================
apiRouter.get("/listings", (req: Request, res: Response) => {
  try {
    const { ownerId, status, propertyType, district, search } = req.query;

    let query = `
      SELECT l.*, 
             r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
             r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive
      FROM listings l
      LEFT JOIN exchange_requirements r ON l.id = r.listingId
      WHERE 1=1
    `;
    const params: unknown[] = [];

    const user = req.user;

    // Public / Unauthenticated Data Protection:
    // Only approved/reviewed listings are accessible to the public discovery endpoints!
    if (!user) {
      query += " AND l.status = 'reviewed'";
    } else if (user.role === "admin") {
      // Admins can query any status requested
      if (status && typeof status === "string") {
        query += " AND l.status = ?";
        params.push(status);
      }
    } else if (user.role === "broker") {
      // Brokers can view reviewed or under review/submitted
      if (status && typeof status === "string") {
        query += " AND l.status = ?";
        params.push(status);
      } else {
        query += " AND l.status IN ('submitted', 'under_review', 'reviewed')";
      }
    } else if (user.role === "owner") {
      // Owners querying their own properties can see all statuses; otherwise only reviewed
      if (ownerId && ownerId === user.id) {
        if (status && typeof status === "string") {
          query += " AND l.status = ?";
          params.push(status);
        }
      } else {
        query += " AND l.status = 'reviewed'";
      }
    }

    if (ownerId && typeof ownerId === "string") {
      query += " AND l.ownerId = ?";
      params.push(ownerId);
    }
    if (propertyType && typeof propertyType === "string") {
      query += " AND l.propertyType = ?";
      params.push(propertyType);
    }
    if (district && typeof district === "string") {
      query += " AND l.district = ?";
      params.push(district);
    }
    if (search && typeof search === "string") {
      query += " AND (l.title LIKE ? OR l.locality LIKE ? OR l.ownerName LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    query += " ORDER BY l.createdAt DESC";

    const rows = db.prepare(query).all(...params) as unknown as DbListingRow[];
    let listings = rows.map(rowToListing);

    // Sanitize metadata for public/non-owner view (strip rejection reasons)
    if (!user || user.role === "owner") {
      listings = listings.map((l) => {
        if (!user || (user.role === "owner" && l.ownerId !== user.id)) {
          return {
            ...l,
            metadata: {
              ...l.metadata,
              rejectionReason: undefined
            }
          };
        }
        return l;
      });
    }

    res.json({ success: true, count: listings.length, data: listings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get("/listings/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const listing = getDbListingById(id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    const user = req.user;
    // If not reviewed, only the owner, broker, or admin can access it!
    if (listing.status !== "reviewed") {
      if (!user || (user.role !== "admin" && user.role !== "broker" && user.id !== listing.ownerId)) {
        return res.status(404).json({ success: false, error: "Listing not found or not published" });
      }
    }

    // Strip rejectionReason for public or other owners
    if (!user || (user.role === "owner" && user.id !== listing.ownerId)) {
      if (listing.metadata) {
        listing.metadata.rejectionReason = undefined;
      }
    }

    res.json({ success: true, data: listing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post("/listings", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Validation
    if (!body.title || !body.propertyType || !body.district || !body.locality || !body.area || !body.ownerDeclaredValue) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory property fields (title, propertyType, district, locality, area, ownerDeclaredValue)."
      });
    }

    // STRICT SECURITY: Derive owner identity from authenticated user! Never trust client body!
    const ownerId = req.user!.id;
    const ownerName = req.user!.name;

    // Generate listing ID
    const countRow = db.prepare("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    const id = `ASSET-${String(countRow.count + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();

    // Default image based on property type
    const fallbackImage = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";
    const imageUrl = body.imageUrl || fallbackImage;

    // Resolve coordinates if not provided
    const tempListing: Listing = {
      id,
      ownerId,
      ownerName,
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

    runInTransaction(() => {
      // Insert into listings table
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
          description, imageUrl, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, 'real_estate', ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, NULL, 'submitted',
          NULL, 0, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
      `).run(
        id,
        ownerId,
        ownerName,
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
        body.surveyNumber || "Sy. No. 101/1",
        body.conversionStatus || "DC Converted",
        body.description || "Freshly registered property ready for broker valuation assessment.",
        imageUrl,
        now,
        now
      );

      // Insert exchange requirements
      const wants = body.wants || {};
      db.prepare(`
        INSERT INTO exchange_requirements (
          id, listingId, desiredPropertyTypes, preferredDistricts,
          preferredLocalities, minArea, minAreaUnit, maxCashToPay, maxCashToReceive,
          minValue, maxValue, openToCashAdjustment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `req-${id}`,
        id,
        JSON.stringify(wants.propertyTypes || []),
        JSON.stringify(wants.preferredDistricts || [body.district]),
        JSON.stringify(wants.preferredLocations || [body.locality]),
        wants.minArea ? Number(wants.minArea) : null,
        wants.minAreaUnit || "sq_ft",
        wants.maxCashToPay !== undefined ? Number(wants.maxCashToPay) : null,
        wants.maxCashToReceive !== undefined ? Number(wants.maxCashToReceive) : null,
        wants.minValue ? Number(wants.minValue) : null,
        wants.maxValue ? Number(wants.maxValue) : null,
        wants.openToCashAdjustment === false ? 0 : 1
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'listing', ?, 'create_listing', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        id,
        JSON.stringify({ title: body.title, propertyType: body.propertyType, declaredValue: body.ownerDeclaredValue }),
        ownerName,
        now
      );
    });

    const created = getDbListingById(id);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put("/listings/:id", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = getDbListingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    // STRICT SECURITY: Ownership verification (only owner who owns listing or admin can modify)
    if (req.user!.role !== "admin" && existing.ownerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to modify this property listing."
      });
    }

    // STRICT SECURITY: Lock check
    if (existing.locked) {
      return res.status(400).json({
        success: false,
        error: "Cannot edit property while locked in active exchange proposal."
      });
    }

    const body = req.body;
    const now = new Date().toISOString();

    runInTransaction(() => {
      // Whitelist only editable fields; never allow altering reviewedValue, status, locked, or ownerId
      db.prepare(`
        UPDATE listings SET
          title = COALESCE(?, title),
          district = COALESCE(?, district),
          locality = COALESCE(?, locality),
          area = COALESCE(?, area),
          areaUnit = COALESCE(?, areaUnit),
          ownerDeclaredValue = COALESCE(?, ownerDeclaredValue),
          description = COALESCE(?, description),
          updatedAt = ?
        WHERE id = ?
      `).run(
        body.title ?? null,
        body.district ?? null,
        body.locality ?? null,
        body.area ? Number(body.area) : null,
        body.areaUnit ?? null,
        body.ownerDeclaredValue ? Number(body.ownerDeclaredValue) : null,
        body.description ?? null,
        now,
        id
      );

      if (body.wants) {
        db.prepare(`
          UPDATE exchange_requirements SET
            desiredPropertyTypes = COALESCE(?, desiredPropertyTypes),
            preferredLocalities = COALESCE(?, preferredLocalities),
            minArea = COALESCE(?, minArea),
            maxCashToPay = COALESCE(?, maxCashToPay),
            maxCashToReceive = COALESCE(?, maxCashToReceive)
          WHERE listingId = ?
        `).run(
          body.wants.propertyTypes ? JSON.stringify(body.wants.propertyTypes) : null,
          body.wants.preferredLocations ? JSON.stringify(body.wants.preferredLocations) : null,
          body.wants.minArea ? Number(body.wants.minArea) : null,
          body.wants.maxCashToPay !== undefined ? Number(body.wants.maxCashToPay) : null,
          body.wants.maxCashToReceive !== undefined ? Number(body.wants.maxCashToReceive) : null,
          id
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'listing', ?, 'update_listing', ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        id,
        JSON.stringify({ title: body.title, updatedFields: Object.keys(body) }),
        req.user!.name,
        now
      );
    });

    const updated = getDbListingById(id);
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 5. Intelligent Match Discovery
// ==========================================
apiRouter.get("/matches", (req: Request, res: Response) => {
  try {
    const { ownerId, listingId, radiusKm } = req.query;
    const radius = radiusKm ? Number(radiusKm) : 60;

    // Retrieve active listings from database
    const allListings = getAllDbListings();

    // Run graph matching engine
    const matches = findMatches(allListings, { radiusKm: radius });

    // Filter by owner or listing if requested
    let filteredMatches = matches;
    if (listingId && typeof listingId === "string") {
      filteredMatches = matches.filter((m) => m.listingIds.includes(listingId));
    } else if (ownerId && typeof ownerId === "string") {
      const ownerListingIds = new Set(allListings.filter((l) => l.ownerId === ownerId).map((l) => l.id));
      filteredMatches = matches.filter((m) => m.listingIds.some((id) => ownerListingIds.has(id)));
    }

    // Persist discovered matches into SQLite database cache
    const now = new Date().toISOString();
    const insertMatch = db.prepare(`
      INSERT OR REPLACE INTO matches (
        id, matchType, partyCount, cycle, listingIds, totalAbsoluteBoot,
        locationScoreKm, matchScore, verificationStatus, status, explanation,
        reasons, exchangeLegs, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reviewed', ?, ?, ?, ?, ?, ?)
    `);

    const insertParticipant = db.prepare(`
      INSERT OR REPLACE INTO match_participants (
        id, matchId, listingId, ownerId, ownerName, givesAssetId, givesPropertyType,
        givesValue, receivesAssetId, receivesPropertyType, receivesValue, amount,
        action, cashDifference, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const match of filteredMatches) {
      const existing = db.prepare("SELECT status FROM matches WHERE id = ?").get(match.id) as { status: string } | undefined;
      const status = existing ? existing.status : "proposed";

      insertMatch.run(
        match.id,
        match.partyCount === 2 ? "direct" : "3-party",
        match.partyCount,
        JSON.stringify(match.cycle),
        JSON.stringify(match.listingIds),
        match.totalAbsoluteBoot,
        match.locationScoreKm,
        match.matchScore,
        status,
        match.explanation,
        JSON.stringify(match.reasons),
        JSON.stringify(match.exchangeLegs),
        match.createdAt,
        now
      );

      for (const boot of match.boots) {
        insertParticipant.run(
          `${match.id}-${boot.listingId}`,
          match.id,
          boot.listingId,
          boot.ownerId,
          boot.ownerName,
          boot.givesAssetId,
          boot.givesPropertyType,
          boot.givesValue,
          boot.receivesAssetId,
          boot.receivesPropertyType,
          boot.receivesValue,
          boot.amount,
          boot.action,
          boot.cashDifference,
          boot.explanation
        );
      }
    }

    // Read matches with stored responses
    const enrichedMatches = filteredMatches.map((m) => {
      const stored = db.prepare("SELECT status FROM matches WHERE id = ?").get(m.id) as { status: string } | undefined;
      const responsesRows = db.prepare("SELECT listingId, decision FROM match_responses WHERE matchId = ?").all(m.id) as Array<{ listingId: string; decision: "pending" | "accepted" | "declined" }>;
      const responses: Record<string, "pending" | "accepted" | "declined"> = Object.fromEntries(
        m.listingIds.map((id) => [id, "pending"])
      );
      for (const r of responsesRows) {
        responses[r.listingId] = r.decision;
      }
      return {
        ...m,
        status: (stored?.status as Match["status"]) || m.status,
        responses
      };
    });

    res.json({
      success: true,
      count: enrichedMatches.length,
      twoPartyCount: enrichedMatches.filter((m) => m.partyCount === 2).length,
      threePartyCount: enrichedMatches.filter((m) => m.partyCount === 3).length,
      data: enrichedMatches
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get("/matches/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const allListings = getAllDbListings();
    const matches = findMatches(allListings, { radiusKm: 60 });
    const match = matches.find((m) => m.id === id);

    if (!match) {
      return res.status(404).json({ success: false, error: "Match not found" });
    }

    // Load responses
    const stored = db.prepare("SELECT status FROM matches WHERE id = ?").get(id) as { status: string } | undefined;
    const responsesRows = db.prepare("SELECT listingId, decision FROM match_responses WHERE matchId = ?").all(id) as Array<{ listingId: string; decision: "pending" | "accepted" | "declined" }>;
    const responses: Record<string, "pending" | "accepted" | "declined"> = Object.fromEntries(
      match.listingIds.map((lid) => [lid, "pending"])
    );
    for (const r of responsesRows) {
      responses[r.listingId] = r.decision;
    }

    // Attach full listing metadata to each participant
    const detailedParticipants = match.boots.map((boot) => {
      const listing = getDbListingById(boot.listingId);
      const receivedListing = getDbListingById(boot.receivesAssetId);
      return {
        ...boot,
        ownedProperty: listing,
        receivedProperty: receivedListing
      };
    });

    res.json({
      success: true,
      data: {
        ...match,
        status: (stored?.status as Match["status"]) || match.status,
        responses,
        participants: detailedParticipants
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 6. Transaction Workflow & Locking Lifecycle
// ==========================================
apiRouter.post("/workflow/propose", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
  try {
    const { matchId } = req.body;
    if (!matchId) {
      return res.status(400).json({ success: false, error: "matchId is required" });
    }

    // Check if this match has already been proposed
    const existingMatch = db.prepare("SELECT status FROM matches WHERE id = ?").get(matchId) as { status: string } | undefined;
    if (existingMatch && existingMatch.status === "proposed") {
      return res.status(400).json({
        success: false,
        error: "This match is already proposed and currently open in escrow."
      });
    }

    const allListings = getAllDbListings();
    const matches = findMatches(allListings, { radiusKm: 60 });
    const targetMatch = matches.find((m) => m.id === matchId);

    if (!targetMatch) {
      return res.status(404).json({ success: false, error: "Match not found or listings no longer eligible" });
    }

    // Role check: non-admin owners can only propose matches that involve at least one of their properties
    if (req.user!.role !== "admin") {
      const userParticipates = targetMatch.boots.some((b) => b.ownerId === req.user!.id);
      if (!userParticipates) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You can only propose matches involving your own properties."
        });
      }
    }

    // Validate all participating listings exist, are reviewed, and are not locked
    for (const listingId of targetMatch.listingIds) {
      const listing = getDbListingById(listingId);
      if (!listing) {
        return res.status(400).json({ success: false, error: `Listing ${listingId} not found.` });
      }
      if (listing.status !== "reviewed") {
        return res.status(400).json({ success: false, error: `Listing ${listingId} is not approved/reviewed (current status: ${listing.status}).` });
      }
      if (listing.locked) {
        return res.status(400).json({ success: false, error: `Listing ${listingId} is already locked in an active proposal.` });
      }
    }

    // Check if an active proposed match already exists for any participating listing
    const activeMatches = db.prepare("SELECT id, listingIds FROM matches WHERE status = 'proposed'").all() as Array<{ id: string; listingIds: string }>;
    for (const am of activeMatches) {
      try {
        const ids = JSON.parse(am.listingIds) as string[];
        const overlap = ids.some((id) => targetMatch.listingIds.includes(id));
        if (overlap) {
          return res.status(400).json({
            success: false,
            error: "An active proposal already exists for one or more participating properties."
          });
        }
      } catch {
        // ignore JSON parse err
      }
    }

    // Instantiate MatchWorkflow with database listings to run engine validation
    const workflow = new MatchWorkflow(allListings);
    workflow.propose(targetMatch);

    // Atomically persist locks, match, participants, responses, and audit log
    runInTransaction(() => {
      const updateLock = db.prepare("UPDATE listings SET locked = 1 WHERE id = ?");
      for (const id of targetMatch.listingIds) {
        updateLock.run(id);
      }

      db.prepare(`
        INSERT OR REPLACE INTO matches (
          id, matchType, partyCount, cycle, listingIds, totalAbsoluteBoot,
          locationScoreKm, matchScore, verificationStatus, status, explanation,
          reasons, exchangeLegs, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reviewed', 'proposed', ?, ?, ?, ?, ?)
      `).run(
        targetMatch.id,
        targetMatch.partyCount === 2 ? "direct" : "3-party",
        targetMatch.partyCount,
        JSON.stringify(targetMatch.cycle),
        JSON.stringify(targetMatch.listingIds),
        targetMatch.totalAbsoluteBoot,
        targetMatch.locationScoreKm,
        targetMatch.matchScore,
        targetMatch.explanation,
        JSON.stringify(targetMatch.reasons),
        JSON.stringify(targetMatch.exchangeLegs),
        targetMatch.createdAt,
        new Date().toISOString()
      );

      const insertParticipant = db.prepare(`
        INSERT OR REPLACE INTO match_participants (
          id, matchId, listingId, ownerId, ownerName, givesAssetId, givesPropertyType,
          givesValue, receivesAssetId, receivesPropertyType, receivesValue, amount,
          action, cashDifference, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const boot of targetMatch.boots) {
        insertParticipant.run(
          `${targetMatch.id}-${boot.listingId}`,
          targetMatch.id,
          boot.listingId,
          boot.ownerId,
          boot.ownerName,
          boot.givesAssetId,
          boot.givesPropertyType,
          boot.givesValue,
          boot.receivesAssetId,
          boot.receivesPropertyType,
          boot.receivesValue,
          boot.amount,
          boot.action,
          boot.cashDifference,
          boot.explanation
        );
      }

      const insertResponse = db.prepare(`
        INSERT OR REPLACE INTO match_responses (id, matchId, listingId, ownerId, decision, respondedAt)
        VALUES (?, ?, ?, ?, 'pending', NULL)
      `);

      for (const boot of targetMatch.boots) {
        insertResponse.run(`${targetMatch.id}-${boot.listingId}`, targetMatch.id, boot.listingId, boot.ownerId);
      }

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'match', ?, 'propose_match', ?, ?, ?)
      `).run(
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        targetMatch.id,
        JSON.stringify({ listingIds: targetMatch.listingIds, initiatedBy: req.user!.name }),
        req.user!.name,
        new Date().toISOString()
      );
    });

    res.json({
      success: true,
      message: `Match ${targetMatch.id} proposed successfully. Participating properties locked in escrow.`,
      matchId: targetMatch.id
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

apiRouter.post("/workflow/respond", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
  try {
    const { matchId, listingId, decision } = req.body;

    if (!matchId || !listingId || !["accepted", "declined"].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: "matchId, listingId, and decision ('accepted' | 'declined') are required."
      });
    }

    const storedMatchRow = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as { status: string; listingIds: string } | undefined;

    if (!storedMatchRow) {
      return res.status(404).json({ success: false, error: "Match proposal not found in registry." });
    }

    if (storedMatchRow.status !== "proposed") {
      return res.status(400).json({
        success: false,
        error: `Match ${matchId} is not open for responses (current status: ${storedMatchRow.status}).`
      });
    }

    // Check listing and ownership
    const listing = getDbListingById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: `Listing ${listingId} not found.` });
    }

    // Section 5 Rule: Do not allow an Admin account to substitute for an owner's consent in the normal owner workflow.
    // Only the actual property owner who owns this listing can vote!
    if (listing.ownerId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only the property owner can accept or decline participation in an asset exchange."
      });
    }

    // Check response record
    const responseRow = db.prepare("SELECT * FROM match_responses WHERE matchId = ? AND listingId = ?").get(matchId, listingId) as { decision: string } | undefined;
    if (!responseRow) {
      return res.status(400).json({ success: false, error: `Listing ${listingId} is not a participant in match ${matchId}.` });
    }

    if (responseRow.decision !== "pending") {
      return res.status(400).json({ success: false, error: `Response already recorded for listing ${listingId} (${responseRow.decision}).` });
    }

    const now = new Date().toISOString();
    const participantIds = JSON.parse(storedMatchRow.listingIds) as string[];

    const result = runInTransaction(() => {
      // Update response
      db.prepare(`
        UPDATE match_responses SET decision = ?, respondedAt = ?
        WHERE matchId = ? AND listingId = ?
      `).run(decision, now, matchId, listingId);

      if (decision === "declined") {
        // Decline releases all locks immediately
        db.prepare("UPDATE matches SET status = 'declined', updatedAt = ? WHERE id = ?").run(now, matchId);
        const unlock = db.prepare("UPDATE listings SET locked = 0 WHERE id = ?");
        for (const id of participantIds) {
          unlock.run(id);
        }

        db.prepare(`
          INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
          VALUES (?, 'match', ?, 'match_declined', ?, ?, ?)
        `).run(`log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, JSON.stringify({ declinedBy: listingId, owner: req.user!.name }), req.user!.name, now);

        return {
          success: true,
          message: `Exchange proposal declined by participant ${listingId}. All participant asset locks released.`,
          matchStatus: "declined"
        };
      }

      // If accepted, check whether all participants have accepted
      const allResponses = db.prepare("SELECT decision FROM match_responses WHERE matchId = ?").all(matchId) as Array<{ decision: string }>;
      const allAccepted = allResponses.length > 0 && allResponses.every((r) => r.decision === "accepted");

      if (allAccepted) {
        db.prepare("UPDATE matches SET status = 'accepted', updatedAt = ? WHERE id = ?").run(now, matchId);

        db.prepare(`
          INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
          VALUES (?, 'match', ?, 'match_unanimously_accepted', ?, ?, ?)
        `).run(`log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, JSON.stringify({ participantIds }), req.user!.name, now);

        return {
          success: true,
          message: "Unanimous acceptance achieved! Match confirmed. Escrow asset locks retained.",
          matchStatus: "accepted"
        };
      }

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'match', ?, 'match_accepted_by_participant', ?, ?, ?)
      `).run(`log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, JSON.stringify({ acceptedBy: listingId }), req.user!.name, now);

      return {
        success: true,
        message: `Acceptance recorded for ${listingId}. Awaiting remaining participant responses.`,
        matchStatus: "proposed"
      };
    });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post("/workflow/expire", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
  try {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ success: false, error: "matchId required" });

    const stored = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as { status: string; listingIds: string } | undefined;
    if (!stored || stored.status !== "proposed") {
      return res.status(400).json({ success: false, error: "Match proposal not in open state." });
    }

    const listingIds = JSON.parse(stored.listingIds) as string[];

    if (req.user!.role !== "admin") {
      // Must own at least one listing in the match
      const userOwnsListing = listingIds.some((lid) => {
        const l = getDbListingById(lid);
        return l?.ownerId === req.user!.id;
      });
      if (!userOwnsListing) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You can only expire proposals involving your properties."
        });
      }
    }

    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE matches SET status = 'expired', updatedAt = ? WHERE id = ?").run(now, matchId);

      const unlock = db.prepare("UPDATE listings SET locked = 0 WHERE id = ?");
      for (const id of listingIds) {
        unlock.run(id);
      }

      db.prepare(`
        INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
        VALUES (?, 'match', ?, 'match_expired', ?, ?, ?)
      `).run(`log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, JSON.stringify({ listingIds }), req.user!.name, now);
    });

    res.json({ success: true, message: "Match expired and locks released.", matchStatus: "expired" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 7. Proposals List & Audit Activity
// ==========================================
apiRouter.get("/proposals", requireAuth, (req: Request, res: Response) => {
  try {
    // Brokers do not have access to private swap proposals
    if (req.user!.role === "broker") {
      return res.json({ success: true, count: 0, data: [] });
    }

    const { status } = req.query;
    let query = "SELECT * FROM matches WHERE 1=1";
    const params: unknown[] = [];
    if (status && typeof status === "string" && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }
    query += " ORDER BY updatedAt DESC";

    const matchesRows = db.prepare(query).all(...params) as Array<{
      id: string;
      matchType: string;
      partyCount: number;
      cycle: string;
      listingIds: string;
      totalAbsoluteBoot: number;
      locationScoreKm: number;
      matchScore: number;
      status: string;
      explanation: string;
      reasons: string;
      exchangeLegs: string;
      createdAt: string;
      updatedAt: string;
    }>;

    const proposals = matchesRows.map((m) => {
      const listingIds = JSON.parse(m.listingIds) as string[];
      const responsesRows = db.prepare("SELECT listingId, decision, respondedAt FROM match_responses WHERE matchId = ?").all(m.id) as Array<{
        listingId: string;
        decision: "pending" | "accepted" | "declined";
        respondedAt: string | null;
      }>;
      const participantsRows = db.prepare("SELECT * FROM match_participants WHERE matchId = ?").all(m.id) as any[];

      let participants: any[] = [];
      if (participantsRows.length > 0) {
        participants = participantsRows.map((p) => {
          const listing = getDbListingById(p.listingId);
          const resp = responsesRows.find((r) => r.listingId === p.listingId);
          return {
            ...p,
            response: resp ? resp.decision : "pending",
            respondedAt: resp?.respondedAt || null,
            ownedProperty: listing
          };
        });
      } else {
        // Fallback reconstruction if match_participants wasn't seeded for this match
        participants = listingIds.map((lid) => {
          const listing = getDbListingById(lid);
          const resp = responsesRows.find((r) => r.listingId === lid);
          return {
            matchId: m.id,
            listingId: lid,
            ownerId: listing?.ownerId || "",
            ownerName: listing?.ownerName || "",
            response: resp ? resp.decision : "pending",
            respondedAt: resp?.respondedAt || null,
            ownedProperty: listing
          };
        });
      }

      return {
        id: m.id,
        matchType: m.matchType,
        partyCount: m.partyCount,
        cycle: JSON.parse(m.cycle),
        listingIds,
        totalAbsoluteBoot: m.totalAbsoluteBoot,
        locationScoreKm: m.locationScoreKm,
        matchScore: m.matchScore,
        status: m.status,
        explanation: m.explanation,
        reasons: JSON.parse(m.reasons),
        exchangeLegs: JSON.parse(m.exchangeLegs),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        participants
      };
    });

    let filtered = proposals;
    if (req.user!.role === "owner") {
      // Owners can ONLY see proposals where they own at least one participating property
      filtered = proposals.filter((p) =>
        p.participants.some((part: any) => part.ownerId === req.user!.id) ||
        p.listingIds.some((lid) => {
          const l = getDbListingById(lid);
          return l?.ownerId === req.user!.id;
        })
      );
    } else if (req.user!.role === "admin") {
      // Admin can optionally filter by query param ownerId
      const ownerId = req.query.ownerId;
      if (ownerId && typeof ownerId === "string") {
        filtered = proposals.filter((p) => p.participants.some((part: any) => part.ownerId === ownerId));
      }
    }

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get("/activity", requireAuth, (req: Request, res: Response) => {
  try {
    const { entityType, limit } = req.query;
    const sanitizedLimit = Math.min(Math.max(1, Number(limit) || 50), 100);

    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params: unknown[] = [];

    if (entityType && typeof entityType === "string" && entityType !== "all") {
      query += " AND entityType = ?";
      params.push(entityType);
    }

    if (req.user!.role === "admin") {
      // Admin sees global logs
      query += " ORDER BY timestamp DESC LIMIT ?";
      params.push(sanitizedLimit);
      const rows = db.prepare(query).all(...params);
      return res.json({ success: true, count: rows.length, data: rows });
    }

    if (req.user!.role === "broker") {
      // Broker sees activity performed by them or review actions
      query += " AND (performedBy = ? OR performedBy = ? OR action LIKE '%review%') ORDER BY timestamp DESC LIMIT ?";
      params.push(req.user!.name, req.user!.id, sanitizedLimit);
      const rows = db.prepare(query).all(...params);
      return res.json({ success: true, count: rows.length, data: rows });
    }

    // Owner sees only their own activity and logs related to their properties or proposals
    const ownerListings = db.prepare("SELECT id FROM listings WHERE ownerId = ?").all(req.user!.id) as Array<{ id: string }>;
    const listingIds = ownerListings.map((l) => l.id);

    const ownerProposals = db.prepare("SELECT matchId FROM match_participants WHERE ownerId = ?").all(req.user!.id) as Array<{ matchId: string }>;
    const matchIds = ownerProposals.map((m) => m.matchId);

    const relevantEntityIds = Array.from(new Set([...listingIds, ...matchIds]));

    if (relevantEntityIds.length === 0) {
      query += " AND (performedBy = ? OR performedBy = ?) ORDER BY timestamp DESC LIMIT ?";
      params.push(req.user!.name, req.user!.id, sanitizedLimit);
    } else {
      const placeholders = relevantEntityIds.map(() => "?").join(", ");
      query += ` AND (performedBy = ? OR performedBy = ? OR entityId IN (${placeholders})) ORDER BY timestamp DESC LIMIT ?`;
      params.push(req.user!.name, req.user!.id, ...relevantEntityIds, sanitizedLimit);
    }

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
