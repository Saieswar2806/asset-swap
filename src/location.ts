import type { AreaUnit, Listing } from "./types.js";

export const normalize = (value: string): string =>
  value.trim().toLowerCase().replace(/[-_]/g, " ");

/**
 * Standard area conversion factors to square feet:
 * 1 gunta = 1,089 sq ft (standard in Karnataka revenue system)
 * 1 acre = 40 guntas = 43,560 sq ft
 */
export const SQFT_CONVERSIONS: Record<AreaUnit, number> = {
  sq_ft: 1,
  guntas: 1089,
  acres: 43560
};

export function toSqFt(area: number, unit: AreaUnit = "sq_ft"): number {
  const factor = SQFT_CONVERSIONS[unit] ?? 1;
  return area * factor;
}

/**
 * Karnataka location coordinates database covering major districts & localities:
 * Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur.
 */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  district: string;
}

export const KARNATAKA_GEO_DATABASE: Record<string, GeoCoordinate> = {
  // Bengaluru
  "bengaluru": { latitude: 12.9716, longitude: 77.5946, district: "Bengaluru" },
  "bangalore": { latitude: 12.9716, longitude: 77.5946, district: "Bengaluru" },
  "indiranagar": { latitude: 12.9784, longitude: 77.6408, district: "Bengaluru" },
  "whitefield": { latitude: 12.9698, longitude: 77.7500, district: "Bengaluru" },
  "koramangala": { latitude: 12.9352, longitude: 77.6245, district: "Bengaluru" },
  "jayanagar": { latitude: 12.9308, longitude: 77.5838, district: "Bengaluru" },
  "electronic city": { latitude: 12.8452, longitude: 77.6602, district: "Bengaluru" },
  "yelahanka": { latitude: 13.1007, longitude: 77.5963, district: "Bengaluru" },
  "hsr layout": { latitude: 12.9121, longitude: 77.6446, district: "Bengaluru" },
  "hebbal": { latitude: 13.0358, longitude: 77.5970, district: "Bengaluru" },
  "sarjapur": { latitude: 12.8617, longitude: 77.7863, district: "Bengaluru" },

  // Ramanagara
  "ramanagara": { latitude: 12.7209, longitude: 77.2799, district: "Ramanagara" },
  "ramanagara town": { latitude: 12.7209, longitude: 77.2799, district: "Ramanagara" },
  "harohalli": { latitude: 12.6738, longitude: 77.4665, district: "Ramanagara" },
  "kanakapura": { latitude: 12.5463, longitude: 77.4194, district: "Ramanagara" },
  "channapatna": { latitude: 12.6518, longitude: 77.2089, district: "Ramanagara" },
  "bidadi": { latitude: 12.7967, longitude: 77.3828, district: "Ramanagara" },
  "magadi": { latitude: 12.9566, longitude: 77.2272, district: "Ramanagara" },

  // Mysuru
  "mysuru": { latitude: 12.2958, longitude: 76.6394, district: "Mysuru" },
  "mysore": { latitude: 12.2958, longitude: 76.6394, district: "Mysuru" },
  "vijayanagar": { latitude: 12.3364, longitude: 76.6083, district: "Mysuru" },
  "jayalakshmipuram": { latitude: 12.3218, longitude: 76.6267, district: "Mysuru" },
  "kuvempunagar": { latitude: 12.2858, longitude: 76.6256, district: "Mysuru" },
  "gokulam": { latitude: 12.3323, longitude: 76.6268, district: "Mysuru" },
  "nanjangud": { latitude: 12.1186, longitude: 76.6806, district: "Mysuru" },
  "bannur": { latitude: 12.3314, longitude: 76.8624, district: "Mysuru" },

  // Mandya
  "mandya": { latitude: 12.5226, longitude: 76.8976, district: "Mandya" },
  "mandya town": { latitude: 12.5226, longitude: 76.8976, district: "Mandya" },
  "maddur": { latitude: 12.5844, longitude: 77.0450, district: "Mandya" },
  "srirangapatna": { latitude: 12.4238, longitude: 76.6947, district: "Mandya" },
  "pandavapura": { latitude: 12.4939, longitude: 76.6713, district: "Mandya" },
  "malavalli": { latitude: 12.3872, longitude: 77.0560, district: "Mandya" },

  // Tumakuru
  "tumakuru": { latitude: 13.3422, longitude: 77.1017, district: "Tumakuru" },
  "tumkur": { latitude: 13.3422, longitude: 77.1017, district: "Tumakuru" },
  "tumakuru town": { latitude: 13.3422, longitude: 77.1017, district: "Tumakuru" },
  "kunigal": { latitude: 13.0238, longitude: 77.0264, district: "Tumakuru" },
  "tiptur": { latitude: 13.2564, longitude: 76.4789, district: "Tumakuru" },
  "sira": { latitude: 13.7447, longitude: 76.9069, district: "Tumakuru" },
  "gubbi": { latitude: 13.3106, longitude: 76.9405, district: "Tumakuru" },

  // Chikkaballapur
  "chikkaballapur": { latitude: 13.4355, longitude: 77.7275, district: "Chikkaballapur" },
  "chikkaballapura": { latitude: 13.4355, longitude: 77.7275, district: "Chikkaballapur" },
  "chikkaballapur town": { latitude: 13.4355, longitude: 77.7275, district: "Chikkaballapur" },
  "gauribidanur": { latitude: 13.6127, longitude: 77.5186, district: "Chikkaballapur" },
  "sidlaghatta": { latitude: 13.3917, longitude: 77.8631, district: "Chikkaballapur" },
  "bagepalli": { latitude: 13.7844, longitude: 77.7942, district: "Chikkaballapur" },
  "chintamani": { latitude: 13.4009, longitude: 78.0569, district: "Chikkaballapur" }
};

export function lookupCoordinates(locality: string, district?: string): { lat: number; lon: number } | null {
  const normLoc = normalize(locality);
  if (KARNATAKA_GEO_DATABASE[normLoc]) {
    return {
      lat: KARNATAKA_GEO_DATABASE[normLoc].latitude,
      lon: KARNATAKA_GEO_DATABASE[normLoc].longitude
    };
  }

  if (district) {
    const normDist = normalize(district);
    if (KARNATAKA_GEO_DATABASE[normDist]) {
      return {
        lat: KARNATAKA_GEO_DATABASE[normDist].latitude,
        lon: KARNATAKA_GEO_DATABASE[normDist].longitude
      };
    }
  }

  return null;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves coordinates for a listing, using explicit lat/lon if provided or looking up in the Karnataka geo database.
 */
export function resolveCoordinates(listing: Listing): { lat: number; lon: number } | null {
  if (
    typeof listing.latitude === "number" &&
    typeof listing.longitude === "number" &&
    !Number.isNaN(listing.latitude) &&
    !Number.isNaN(listing.longitude)
  ) {
    return { lat: listing.latitude, lon: listing.longitude };
  }
  return lookupCoordinates(listing.locality, listing.district);
}

/**
 * Returns the geographical distance in kilometers between seeker and target property.
 * If target matches preferredLocations explicitly, distance is 0 km (exact preference match).
 * If coordinates can be resolved and distance is within radiusKm, returns the actual distance.
 * Otherwise returns null indicating location incompatibility.
 */
export function locationDistanceKm(
  seeker: Listing,
  target: Listing,
  radiusKm: number = 50
): number | null {
  const preferred = (seeker.wants.preferredLocations ?? []).map(normalize);
  const targetLocality = normalize(target.locality);
  const targetDistrict = normalize(target.district);

  // Exact preference match: target locality or district directly listed in preferredLocations
  if (
    preferred.includes(targetLocality) ||
    preferred.includes(targetDistrict) ||
    preferred.some((p) => targetLocality.includes(p) || p.includes(targetLocality)) ||
    preferred.some((p) => targetDistrict.includes(p) || p.includes(targetDistrict))
  ) {
    return 0;
  }

  // Coordinate-based Haversine distance within configured radius
  const seekerCoords = resolveCoordinates(seeker);
  const targetCoords = resolveCoordinates(target);

  if (seekerCoords && targetCoords) {
    const distance = haversineKm(
      seekerCoords.lat,
      seekerCoords.lon,
      targetCoords.lat,
      targetCoords.lon
    );
    const effectiveRadius = seeker.wants.maxDistanceKm ?? radiusKm;
    if (distance <= effectiveRadius) {
      return Math.round(distance * 10) / 10;
    }
  }

  return null;
}
