import { getAllDbListings, getDbListingById } from "./db.js";
import { resolveCoordinates, haversineKm, toSqFt, normalize } from "../location.js";
import type { Listing, ComparableProperty } from "../types.js";

export interface ComparableResult {
  target: {
    id: string;
    title: string;
    propertyType: string;
    locality: string;
    district: string;
    area: number;
    areaUnit: string;
    ownerDeclaredValue: number;
    reviewedValue?: number;
    sqFt: number;
  };
  comparables: ComparableProperty[];
  totalFound: number;
  brokerJurisdiction?: string;
  hasInsufficientData: boolean;
  message?: string;
}

/**
 * Finds and ranks relevant reference properties to assist brokers during manual valuation.
 * 
 * Rules:
 * 1. Strict Property Type Segregation:
 *    - Plots ONLY compare to plots.
 *    - Agricultural land ONLY compares to agricultural land.
 *    - Apartments ONLY compare to apartments.
 *    - Villas/Houses ONLY compare to villas/houses.
 * 2. Location Proximity:
 *    - Uses real coordinates when available for exact distance (Haversine km).
 *    - Uses locality/district matching when coordinates are unavailable without fabricating km.
 * 3. Area Similarity:
 *    - Evaluates square footage difference ratio.
 * 4. Value Clarity:
 *    - Clearly separates verified broker-reviewed valuations, market asking prices, and owner-declared estimates.
 * 5. Privacy Safeguard:
 *    - Strips all private owner contact details.
 */
export function getComparableProperties(
  target: Listing,
  brokerJurisdiction?: string,
  limit: number = 6
): ComparableResult {
  const targetSqFt = toSqFt(target.area, target.areaUnit);
  const targetCoords = resolveCoordinates(target);

  const targetSummary = {
    id: target.id,
    title: target.title || target.locality,
    propertyType: target.propertyType,
    locality: target.locality,
    district: target.district,
    area: target.area,
    areaUnit: target.areaUnit,
    ownerDeclaredValue: target.ownerDeclaredValue,
    reviewedValue: target.reviewedValue,
    sqFt: targetSqFt
  };

  const normTargetLocality = normalize(target.locality);
  const normTargetDistrict = normalize(target.district);

  // Parse broker operating jurisdiction
  const jurisdictionTokens = (brokerJurisdiction || "")
    .split(/[,;/]/)
    .map(normalize)
    .filter((t) => t.length > 0);

  // Fetch all candidate properties from database
  const allListings = getAllDbListings();

  const candidates: Array<{
    comparable: ComparableProperty;
    score: number;
  }> = [];

  for (const item of allListings) {
    // 1. Exclude target property itself
    if (item.id === target.id) continue;

    // 2. Exclude rejected properties
    if (item.status === "rejected") continue;

    // 3. STRICT PROPERTY TYPE CHECK:
    // Agricultural land must NEVER be compared to apartments or plots!
    if (item.propertyType !== target.propertyType) {
      continue;
    }

    const itemSqFt = toSqFt(item.area, item.areaUnit);
    if (itemSqFt <= 0) continue;

    const itemCoords = resolveCoordinates(item);

    // Calculate proximity
    let distanceKm: number | null = null;
    let proximityLabel = "";
    let distanceScore = 0;

    if (targetCoords && itemCoords) {
      const d = haversineKm(
        targetCoords.lat,
        targetCoords.lon,
        itemCoords.lat,
        itemCoords.lon
      );
      distanceKm = Math.round(d * 10) / 10;
      proximityLabel = `${distanceKm} km away`;

      if (distanceKm <= 5) distanceScore = 55;
      else if (distanceKm <= 15) distanceScore = 45;
      else if (distanceKm <= 30) distanceScore = 35;
      else if (distanceKm <= 60) distanceScore = 20;
      else if (distanceKm <= 100) distanceScore = 10;
      else distanceScore = 2; // Far distance penalty
    } else {
      // Coordinate fallback without fabricating km
      const normLoc = normalize(item.locality);
      const normDist = normalize(item.district);

      if (normLoc === normTargetLocality || normLoc.includes(normTargetLocality) || normTargetLocality.includes(normLoc)) {
        proximityLabel = `Same Locality (${item.locality})`;
        distanceScore = 50;
      } else if (normDist === normTargetDistrict || normDist.includes(normTargetDistrict)) {
        proximityLabel = `Same District (${item.district})`;
        distanceScore = 32;
      } else {
        proximityLabel = `Regional Area (${item.district})`;
        distanceScore = 8;
      }
    }

    // Area similarity scoring (lower difference ratio = higher score)
    const areaDiffRatio = Math.abs(targetSqFt - itemSqFt) / Math.max(targetSqFt, itemSqFt, 1);
    const areaScore = Math.max(0, (1 - areaDiffRatio)) * 30;

    // Reference Valuation resolution
    let referenceValuation = item.ownerDeclaredValue;
    let referenceType: ComparableProperty["referenceType"] = "owner_declared_value";
    let referenceSource = "Owner-Declared Value (Unverified Submission)";
    let isVerified = false;
    let verificationScore = 0;

    if (typeof item.reviewedValue === "number" && item.reviewedValue > 0) {
      referenceValuation = item.reviewedValue;
      referenceType = "verified_broker_valuation";
      referenceSource = "Broker-Reviewed Valuation (Survey & Sub-Registrar Verified)";
      isVerified = true;
      verificationScore = 15; // Higher confidence for verified valuations
    } else if (typeof item.askingPrice === "number" && item.askingPrice > 0 && (item.intent === "sell" || item.intent === "both")) {
      referenceValuation = item.askingPrice;
      referenceType = "market_asking_price";
      referenceSource = "Market Asking Price (Public Sale Listing)";
      isVerified = false;
      verificationScore = 8;
    }

    // Rate per sq ft
    const ratePerSqFt = Math.round(referenceValuation / itemSqFt);

    // Broker operating area bonus
    let brokerContextScore = 0;
    const normItemDistrict = normalize(item.district);
    const normItemLocality = normalize(item.locality);
    if (
      jurisdictionTokens.some(
        (token) => normItemDistrict.includes(token) || token.includes(normItemDistrict) || normItemLocality.includes(token)
      )
    ) {
      brokerContextScore = 5;
    }

    const totalScore = distanceScore + areaScore + verificationScore + brokerContextScore;

    // Only include reasonably relevant properties (must have minimum proximity or location alignment)
    if (distanceScore >= 8 || areaDiffRatio <= 0.6) {
      candidates.push({
        comparable: {
          id: item.id,
          title: item.title || `${item.locality}, ${item.district}`,
          propertyType: item.propertyType,
          locality: item.locality,
          district: item.district,
          taluk: item.taluk,
          area: item.area,
          areaUnit: item.areaUnit,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          referenceValuation,
          referenceType,
          referenceSource,
          isVerified,
          distanceKm,
          proximityLabel,
          ratePerSqFt,
          imageUrl: item.imageUrl,
          images: item.images,
          status: item.status,
          intent: item.intent
        },
        score: totalScore
      });
    }
  }

  // Sort candidates by total score descending
  candidates.sort((a, b) => b.score - a.score);

  const topComparables = candidates.slice(0, limit).map((c) => c.comparable);

  if (topComparables.length === 0) {
    return {
      target: targetSummary,
      comparables: [],
      totalFound: 0,
      brokerJurisdiction,
      hasInsufficientData: true,
      message: "Insufficient comparable property data available for this location."
    };
  }

  return {
    target: targetSummary,
    comparables: topComparables,
    totalFound: topComparables.length,
    brokerJurisdiction,
    hasInsufficientData: false
  };
}
