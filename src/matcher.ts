import type { Listing, Match, Boot, ExchangeLeg } from "./types.js";
import { locationDistanceKm, toSqFt } from "./location.js";
import { calculateMatchScore } from "./scoring.js";

export interface MatcherOptions {
  radiusKm?: number;
  maxCycles?: number;
  includeThreeParty?: boolean;
}

/**
 * Rounds a monetary amount to 2 decimal places (paise precision)
 * to avoid JavaScript floating-point inaccuracies.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Filters listings that are verified, unlocked, and have a valid broker-reviewed valuation > 0.
 * Unreviewed (draft, submitted, under_review, rejected) and locked listings are strictly excluded.
 */
export function eligible(listings: Listing[]): Listing[] {
  return listings.filter(
    (p) =>
      p !== null &&
      typeof p === "object" &&
      typeof p.id === "string" &&
      p.id.trim().length > 0 &&
      p.status === "reviewed" &&
      !p.locked &&
      typeof p.reviewedValue === "number" &&
      Number.isFinite(p.reviewedValue) &&
      p.reviewedValue > 0 &&
      typeof p.area === "number" &&
      Number.isFinite(p.area) &&
      p.area > 0 &&
      p.wants !== null &&
      typeof p.wants === "object" &&
      Array.isArray(p.wants.propertyTypes) &&
      p.wants.propertyTypes.length > 0
  );
}

/**
 * Evaluates whether Seeker (A) would accept Target (B)'s property.
 * Checks:
 * 1. Different owners (an owner cannot swap with their own listing)
 * 2. Property type compatibility
 * 3. Minimum area requirement (if specified by seeker)
 * 4. Location compatibility within configured radius or preferred locations
 */
export function edgeDistance(a: Listing, b: Listing, radiusKm: number): number | null {
  if (!a || !b || a.id === b.id) return null;

  // 1. Must be distinct owners (case-insensitive normalized)
  const aOwner = (a.ownerId ?? a.ownerName ?? "").trim().toLowerCase();
  const bOwner = (b.ownerId ?? b.ownerName ?? "").trim().toLowerCase();
  if (!aOwner || !bOwner || aOwner === bOwner) return null;

  // 2. Property type compatibility
  if (!a.wants?.propertyTypes?.includes(b.propertyType)) return null;

  // 3. Minimum area requirement
  if (typeof a.wants.minArea === "number" && a.wants.minArea > 0) {
    const requiredSqFt = toSqFt(a.wants.minArea, a.wants.minAreaUnit ?? "sq_ft");
    const targetSqFt = toSqFt(b.area, b.areaUnit);
    if (targetSqFt <= 0 || targetSqFt < requiredSqFt) return null;
  }

  // 4. Location compatibility
  return locationDistanceKm(a, b, radiusKm);
}

/**
 * Calculates cash boot settlement for each participant in an exchange cycle.
 *
 * In an exchange cycle [L0, L1, ..., Ln-1]:
 * Participant Li wants and receives the next participant's asset (Li+1).
 * Participant Li gives their own asset to the preceding participant (Li-1).
 *
 * Formula:
 * Amount = Value of Asset Received − Value of Asset Given
 * - Positive value: Owner received higher value asset -> Owner PAYS cash boot
 * - Negative value: Owner gave higher value asset -> Owner RECEIVES cash boot
 * - Zero: Exact 1:1 asset value exchange (settled)
 *
 * Sum of signed amounts across any closed cycle is guaranteed to equal 0.
 */
export function makeBoots(cycle: Listing[]): Boot[] {
  return cycle.map((person, index) => {
    const receivedAsset = cycle[(index + 1) % cycle.length];
    const givesValue = person.reviewedValue as number;
    const receivesValue = receivedAsset.reviewedValue as number;
    const amount = roundCurrency(receivesValue - givesValue);
    const cashDifference = roundCurrency(Math.abs(amount));

    let action: "pays" | "receives" | "settled";
    let explanation: string;

    if (amount > 0) {
      action = "pays";
      explanation = `${person.ownerName} pays ₹${cashDifference.toLocaleString("en-IN")} cash boot (gives ${person.propertyType} valued at ₹${givesValue.toLocaleString("en-IN")}, receives ${receivedAsset.propertyType} valued at ₹${receivesValue.toLocaleString("en-IN")})`;
    } else if (amount < 0) {
      action = "receives";
      explanation = `${person.ownerName} receives ₹${cashDifference.toLocaleString("en-IN")} cash boot (gives ${person.propertyType} valued at ₹${givesValue.toLocaleString("en-IN")}, receives ${receivedAsset.propertyType} valued at ₹${receivesValue.toLocaleString("en-IN")})`;
    } else {
      action = "settled";
      explanation = `${person.ownerName} has ₹0 cash boot (exact value match at ₹${givesValue.toLocaleString("en-IN")})`;
    }

    return {
      listingId: person.id,
      ownerId: person.ownerId ?? person.ownerName,
      ownerName: person.ownerName,
      givesAssetId: person.id,
      givesPropertyType: person.propertyType,
      givesValue,
      receivesAssetId: receivedAsset.id,
      receivesPropertyType: receivedAsset.propertyType,
      receivesValue,
      amount,
      action,
      cashDifference,
      explanation
    };
  });
}

/**
 * Validates that no participant's maximum cash-to-pay or maximum cash-to-receive limits are exceeded.
 */
export function bootLimitsSatisfied(cycle: Listing[], boots: Boot[]): boolean {
  return boots.every((boot, i) => {
    const wants = cycle[i].wants;
    // If owner has to pay cash
    if (boot.amount > 0) {
      if (typeof wants.maxCashToPay === "number" && boot.amount > wants.maxCashToPay) {
        return false;
      }
    }
    // If owner receives cash
    if (boot.amount < 0) {
      const received = Math.abs(boot.amount);
      if (typeof wants.maxCashToReceive === "number" && received > wants.maxCashToReceive) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Generates a canonical, collision-free match ID:
 * - Direct 2-party swaps [A, B] and [B, A] represent the exact same bilateral exchange,
 *   so they produce rotation-independent ID: match-2p-${sorted[0]}-${sorted[1]}.
 * - 3-party (or multi-party) cycles: Rotations of the same directed cycle [A, B, C], [B, C, A], [C, A, B]
 *   produce the exact same ID (rotated to start with the lexicographically smallest ID).
 * - Different directed cycles on the same nodes (e.g. A->B->C vs A->C->B) produce different IDs.
 */
export function getCanonicalMatchId(ids: string[]): string {
  if (ids.length === 2) {
    const sorted = [...ids].sort();
    return `match-2p-${sorted[0]}-${sorted[1]}`;
  }

  // Find index of lexicographically smallest listing ID
  let minIdx = 0;
  for (let i = 1; i < ids.length; i++) {
    if (ids[i] < ids[minIdx]) {
      minIdx = i;
    }
  }

  const canonicalRotation = [...ids.slice(minIdx), ...ids.slice(0, minIdx)];
  return `match-${ids.length}p-${canonicalRotation.join("-")}`;
}

/**
 * Canonical key for map deduplication (identical to getCanonicalMatchId).
 */
export function canonicalKey(ids: string[]): string {
  return getCanonicalMatchId(ids);
}

/**
 * Generates human-readable reasoning explaining why the exchange was recommended.
 */
function buildExplanation(
  cycle: Listing[],
  boots: Boot[],
  legs: ExchangeLeg[],
  score: number
): { summary: string; reasons: string[] } {
  const partyCount = cycle.length;
  const isDirect = partyCount === 2;
  const totalBoot = roundCurrency(boots.reduce((sum, b) => sum + Math.abs(b.amount), 0));

  const summary = isDirect
    ? `Direct 2-party asset exchange between ${cycle[0].ownerName} and ${cycle[1].ownerName}${
        totalBoot === 0 ? " with perfect value alignment (₹0 cash settlement)." : ` with ₹${(totalBoot / 2).toLocaleString("en-IN")} cash boot settlement.`
      }`
    : `Multi-party 3-way circular asset exchange connecting ${cycle.map((c) => c.ownerName).join(", ")} with net zero cash balance across all parties.`;

  const reasons: string[] = [];

  // Actual physical transfers: Giver gives their asset to Receiver
  for (const leg of legs) {
    reasons.push(
      `${leg.fromOwnerName} gives ${leg.transferredPropertyType} (Asset #${leg.transferredAssetId}, valued at ₹${leg.assetValue.toLocaleString("en-IN")}) to ${leg.toOwnerName}.`
    );
  }

  // Wants satisfaction
  for (let i = 0; i < cycle.length; i++) {
    const seeker = cycle[i];
    const receivedAsset = cycle[(i + 1) % cycle.length];
    reasons.push(
      `${seeker.ownerName} receives desired ${receivedAsset.propertyType} (Asset #${receivedAsset.id}) from ${receivedAsset.ownerName}.`
    );
  }

  // Location compatibility
  for (let i = 0; i < cycle.length; i++) {
    const seeker = cycle[i];
    const target = cycle[(i + 1) % cycle.length];
    // Find distance evaluated by seeker for target
    const legDistance = locationDistanceKm(seeker, target, seeker.wants.maxDistanceKm ?? 50);
    if (legDistance === 0) {
      reasons.push(
        `${seeker.ownerName}'s location requirement satisfied: Target property in ${target.locality}, ${target.district} directly matches preferred locations.`
      );
    } else {
      reasons.push(
        `${seeker.ownerName}'s location requirement satisfied: Target property in ${target.locality} is within ${legDistance ?? 0} km (max radius: ${seeker.wants.maxDistanceKm ?? 50} km).`
      );
    }
  }

  // Cash settlement breakdown
  if (totalBoot === 0) {
    reasons.push("Perfect asset valuation match: ₹0 cash boot required across all participating parties.");
  } else {
    for (const boot of boots) {
      reasons.push(boot.explanation);
    }
    reasons.push("Cycle cash balance verified: Total cash paid equals total cash received (sum of boots = ₹0).");
  }

  reasons.push(`Algorithm Match Quality Rating: ${score}/100.`);

  return { summary, reasons };
}

/**
 * Finds all valid 2-party and 3-party asset exchange matches across the listings.
 */
export function findMatches(
  allListings: Listing[],
  options: MatcherOptions = {}
): Match[] {
  // Validate that input listings do not contain duplicate IDs
  const seenListingIds = new Set<string>();
  for (const item of allListings) {
    if (!item || typeof item.id !== "string") continue;
    if (seenListingIds.has(item.id)) {
      throw new Error(`Duplicate listing ID detected in input listings: ${item.id}`);
    }
    seenListingIds.add(item.id);
  }

  const radiusKm = options.radiusKm ?? 50;
  const maxCycles = options.maxCycles ?? 500;
  const includeThreeParty = options.includeThreeParty !== false;

  const listings = eligible(allListings);
  const byId = new Map(listings.map((p) => [p.id, p]));
  const adjacency = new Map<string, Array<{ id: string; distance: number }>>();

  // Build directed compatibility graph (Edge A -> B means A wants and is willing to receive B's asset)
  for (const a of listings) {
    const edges: Array<{ id: string; distance: number }> = [];
    for (const b of listings) {
      const distance = edgeDistance(a, b, radiusKm);
      if (distance !== null) {
        edges.push({ id: b.id, distance });
      }
    }
    adjacency.set(a.id, edges);
  }

  const found = new Map<string, Match>();

  for (const start of listings) {
    const walk = (path: string[]) => {
      if (found.size >= maxCycles) return;
      const current = path[path.length - 1]!;

      for (const edge of adjacency.get(current) ?? []) {
        // Cycle closing edge back to start of path
        if (edge.id === path[0] && (path.length === 2 || (path.length === 3 && includeThreeParty))) {
          const cycle = path.map((id) => byId.get(id)!);

          // Verify all owners in cycle are distinct
          const ownerIds = new Set(
            cycle.map((p) => (p.ownerId ?? p.ownerName ?? "").trim().toLowerCase())
          );
          if (ownerIds.size !== cycle.length) continue;

          // Cash boot calculations
          const boots = makeBoots(cycle);
          const sum = roundCurrency(boots.reduce((total, b) => total + b.amount, 0));

          // Sum must be zero (with paise monetary precision) and limits must be respected
          if (Math.abs(sum) > 0.001 || !bootLimitsSatisfied(cycle, boots)) continue;

          // Reliable canonical match ID prevents collisions
          const id = getCanonicalMatchId(path);
          if (found.has(id)) continue;

          // Actual physical transfers:
          // In cycle A -> B -> C -> A:
          // A wants B (receives B from B)
          // B wants C (receives C from C)
          // C wants A (receives A from A)
          // Therefore:
          // - A gives Asset A to C
          // - B gives Asset B to A
          // - C gives Asset C to B
          // Each participant path[i] gives their asset to predecessor path[(i - 1 + n) % n]
          const exchangeLegs: ExchangeLeg[] = path.map((giverId, i) => {
            const receiverId = path[(i - 1 + path.length) % path.length]!;
            const giver = byId.get(giverId)!;
            const receiver = byId.get(receiverId)!;
            // Transit distance: distance between receiver and the transferred asset
            const dist = (adjacency.get(receiverId) ?? []).find((e) => e.id === giverId)?.distance ?? 0;
            return {
              fromListingId: giver.id,
              fromOwnerName: giver.ownerName,
              toListingId: receiver.id,
              toOwnerName: receiver.ownerName,
              transferredAssetId: giver.id,
              transferredPropertyType: giver.propertyType,
              assetValue: giver.reviewedValue as number,
              distanceKm: dist
            };
          });

          const locationScoreKm = exchangeLegs.reduce((s, leg) => s + leg.distanceKm, 0);
          const totalAbsoluteBoot = roundCurrency(boots.reduce((s, b) => s + Math.abs(b.amount), 0));
          const totalCycleValue = cycle.reduce((s, c) => s + (c.reviewedValue ?? 0), 0);

          const matchScore = calculateMatchScore({
            locationScoreKm,
            totalAbsoluteBoot,
            totalCycleValue,
            partyCount: path.length,
            maxRadiusKm: radiusKm
          });

          const listingIds = [...path];
          const { summary, reasons } = buildExplanation(cycle, boots, exchangeLegs, matchScore);

          found.set(id, {
            id,
            listingIds,
            cycle: [...path, path[0]!],
            partyCount: path.length,
            exchangeLegs,
            boots,
            totalAbsoluteBoot,
            locationScoreKm,
            matchScore,
            verificationStatus: "reviewed",
            status: "proposed",
            responses: Object.fromEntries(listingIds.map((listingId) => [listingId, "pending"])),
            explanation: summary,
            reasons,
            createdAt: new Date().toISOString()
          });
          continue;
        }

        // Only search for cycles of length 2 and 3
        if (path.length >= 3 || path.includes(edge.id)) continue;

        // Pruning optimization: Keep path[0] as the smallest ID to avoid exploring rotated variations
        if (edge.id < path[0]!) continue;

        walk([...path, edge.id]);
      }
    };

    walk([start.id]);
  }

  // Sort matches by quality score descending, then lower cash boot, then lower distance, then 2-party first
  return [...found.values()].sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      a.totalAbsoluteBoot - b.totalAbsoluteBoot ||
      a.locationScoreKm - b.locationScoreKm ||
      a.partyCount - b.partyCount
  );
}
