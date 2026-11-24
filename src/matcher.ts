import type { Listing, Match, Boot, ExchangeLeg } from "./types.js";
import { locationDistanceKm, toSqFt } from "./location.js";
import { calculateMatchScore } from "./scoring.js";

export interface MatcherOptions {
  radiusKm?: number;
  maxCycles?: number;
  includeThreeParty?: boolean;
}

/**
 * Filters listings that are verified, unlocked, and have a valid broker-reviewed valuation > 0.
 * Unreviewed (draft, submitted, under_review, rejected) and locked listings are strictly excluded.
 */
export function eligible(listings: Listing[]): Listing[] {
  return listings.filter(
    (p) =>
      p.status === "reviewed" &&
      !p.locked &&
      typeof p.reviewedValue === "number" &&
      Number.isFinite(p.reviewedValue) &&
      p.reviewedValue > 0
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
  // 1. Must be distinct owners
  const aOwner = a.ownerId ?? a.ownerName;
  const bOwner = b.ownerId ?? b.ownerName;
  if (aOwner && bOwner && aOwner === bOwner) return null;
  if (a.id === b.id) return null;

  // 2. Property type compatibility
  if (!a.wants.propertyTypes.includes(b.propertyType)) return null;

  // 3. Minimum area requirement
  if (typeof a.wants.minArea === "number" && a.wants.minArea > 0) {
    const requiredSqFt = toSqFt(a.wants.minArea, a.wants.minAreaUnit ?? "sq_ft");
    const targetSqFt = toSqFt(b.area, b.areaUnit);
    if (targetSqFt < requiredSqFt) return null;
  }

  // 4. Location compatibility
  return locationDistanceKm(a, b, radiusKm);
}

/**
 * Calculates cash boot settlement for each participant in an exchange cycle.
 *
 * In an exchange cycle [L0, L1, ..., Ln-1]:
 * Each participant Li gives their own asset and receives the next participant's asset (Li+1).
 *
 * Formula:
 * Amount = Value of Asset Received − Value of Asset Given
 * - Positive value: Owner received higher value asset -> Owner PAYS cash boot
 * - Negative value: Owner gave higher value asset -> Owner RECEIVES cash boot
 * - Zero: Exact 1:1 asset value exchange (settled)
 *
 * Sum of amounts across any closed cycle is guaranteed to equal 0.
 */
export function makeBoots(cycle: Listing[]): Boot[] {
  return cycle.map((person, index) => {
    const next = cycle[(index + 1) % cycle.length];
    const givesValue = person.reviewedValue as number;
    const receivesValue = next.reviewedValue as number;
    const amount = receivesValue - givesValue;
    const cashDifference = Math.abs(amount);

    let action: "pays" | "receives" | "settled";
    let explanation: string;

    if (amount > 0) {
      action = "pays";
      explanation = `${person.ownerName} pays ₹${cashDifference.toLocaleString("en-IN")} cash boot (gives ${person.propertyType} valued at ₹${givesValue.toLocaleString("en-IN")}, receives ${next.propertyType} valued at ₹${receivesValue.toLocaleString("en-IN")})`;
    } else if (amount < 0) {
      action = "receives";
      explanation = `${person.ownerName} receives ₹${cashDifference.toLocaleString("en-IN")} cash boot (gives ${person.propertyType} valued at ₹${givesValue.toLocaleString("en-IN")}, receives ${next.propertyType} valued at ₹${receivesValue.toLocaleString("en-IN")})`;
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
      receivesAssetId: next.id,
      receivesPropertyType: next.propertyType,
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
 * Creates canonical cycle keys to eliminate duplicate cycles.
 * - For 2-party cycles [A, B]: A<->B is identical to B<->A, so sorted listing IDs are used.
 * - For 3-party cycles [A, B, C]: Rotations [A, B, C], [B, C, A], [C, A, B] are identical cycles,
 *   so the lexicographically smallest rotation is used.
 */
export function canonicalKey(ids: string[]): string {
  if (ids.length === 2) {
    return [...ids].sort().join("<->");
  }

  // Rotations
  const rotations: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    rotations.push([...ids.slice(i), ...ids.slice(0, i)].join("->"));
  }
  rotations.sort();
  return rotations[0];
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
  const totalBoot = boots.reduce((sum, b) => sum + Math.abs(b.amount), 0);

  const summary = isDirect
    ? `Direct 2-party asset exchange between ${cycle[0].ownerName} and ${cycle[1].ownerName}${
        totalBoot === 0 ? " with perfect value alignment (₹0 cash settlement)." : ` with ₹${(totalBoot / 2).toLocaleString("en-IN")} cash boot settlement.`
      }`
    : `Multi-party 3-way circular asset exchange connecting ${cycle.map((c) => c.ownerName).join(", ")} with net zero cash balance across all parties.`;

  const reasons: string[] = [];

  // Property type and transfer alignment
  for (const leg of legs) {
    reasons.push(
      `${leg.toOwnerName} receives desired ${leg.transferredPropertyType} from ${leg.fromOwnerName} (transferred asset #${leg.transferredAssetId}, valued at ₹${leg.assetValue.toLocaleString("en-IN")}).`
    );
  }

  // Location compatibility
  for (let i = 0; i < cycle.length; i++) {
    const seeker = cycle[i];
    const target = cycle[(i + 1) % cycle.length];
    const leg = legs[i];
    if (leg.distanceKm === 0) {
      reasons.push(
        `${seeker.ownerName}'s location requirement satisfied: Target property in ${target.locality}, ${target.district} directly matches preferred locations.`
      );
    } else {
      reasons.push(
        `${seeker.ownerName}'s location requirement satisfied: Target property in ${target.locality} is within ${leg.distanceKm} km (max radius: ${seeker.wants.maxDistanceKm ?? 50} km).`
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
  const radiusKm = options.radiusKm ?? 50;
  const maxCycles = options.maxCycles ?? 500;
  const includeThreeParty = options.includeThreeParty !== false;

  const listings = eligible(allListings);
  const byId = new Map(listings.map((p) => [p.id, p]));
  const adjacency = new Map<string, Array<{ id: string; distance: number }>>();

  // Build directed compatibility graph
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
          const ownerIds = new Set(cycle.map((p) => p.ownerId ?? p.ownerName));
          if (ownerIds.size !== cycle.length) continue;

          // Cash boot calculations
          const boots = makeBoots(cycle);
          const sum = boots.reduce((total, b) => total + b.amount, 0);

          // Sum must be zero (with floating point tolerance) and limits must be respected
          if (Math.abs(sum) > 0.01 || !bootLimitsSatisfied(cycle, boots)) continue;

          const key = canonicalKey(path);
          if (found.has(key)) continue;

          // Compute leg distances
          const exchangeLegs: ExchangeLeg[] = path.map((fromId, i) => {
            const toId = path[(i + 1) % path.length]!;
            const fromPerson = byId.get(fromId)!;
            const toPerson = byId.get(toId)!;
            const dist = (adjacency.get(fromId) ?? []).find((e) => e.id === toId)?.distance ?? 0;
            return {
              fromListingId: fromPerson.id,
              fromOwnerName: fromPerson.ownerName,
              toListingId: toPerson.id,
              toOwnerName: toPerson.ownerName,
              transferredAssetId: toPerson.id,
              transferredPropertyType: toPerson.propertyType,
              assetValue: toPerson.reviewedValue as number,
              distanceKm: dist
            };
          });

          const locationScoreKm = exchangeLegs.reduce((s, leg) => s + leg.distanceKm, 0);
          const totalAbsoluteBoot = boots.reduce((s, b) => s + Math.abs(b.amount), 0);
          const totalCycleValue = cycle.reduce((s, c) => s + (c.reviewedValue ?? 0), 0);

          const matchScore = calculateMatchScore({
            locationScoreKm,
            totalAbsoluteBoot,
            totalCycleValue,
            partyCount: path.length,
            maxRadiusKm: radiusKm
          });

          const listingIds = [...path];
          const sortedIds = [...listingIds].sort().join("-");
          const id = `match-${path.length}p-${sortedIds}`;

          const { summary, reasons } = buildExplanation(cycle, boots, exchangeLegs, matchScore);

          found.set(key, {
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
