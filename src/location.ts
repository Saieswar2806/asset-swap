import type { Listing } from "./types.js";

const normalize = (value: string) => value.trim().toLowerCase();

export function haversineKm(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns the distance used for ranking, or null when the target is unacceptable. */
export function locationDistanceKm(
  seeker: Listing,
  target: Listing,
  radiusKm: number
): number | null {
  const preferred = seeker.wants.preferredLocations.map(normalize);
  const targetLocality = normalize(target.locality);
  const targetDistrict = normalize(target.district);

  if (preferred.includes(targetLocality) || preferred.includes(targetDistrict)) {
    return 0;
  }

  if (
    seeker.latitude !== undefined && seeker.longitude !== undefined &&
    target.latitude !== undefined && target.longitude !== undefined
  ) {
    const distance = haversineKm(
      seeker.latitude, seeker.longitude, target.latitude, target.longitude
    );
    return distance <= radiusKm ? distance : null;
  }

  return null;
}
