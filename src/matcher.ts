import type { Listing, Match, Boot } from "./types.js";
import { locationDistanceKm } from "./location.js";

export interface MatcherOptions {
  radiusKm?: number;
  maxCycles?: number;
}

function eligible(listings: Listing[]): Listing[] {
  return listings.filter(
    (p) => p.status === "reviewed" && !p.locked &&
      Number.isFinite(p.reviewedValue) && (p.reviewedValue ?? 0) > 0
  );
}

function edgeDistance(a: Listing, b: Listing, radiusKm: number): number | null {
  if (!a.wants.propertyTypes.includes(b.propertyType)) return null;
  return locationDistanceKm(a, b, radiusKm);
}

function makeBoots(cycle: Listing[]): Boot[] {
  return cycle.map((person, index) => {
    const next = cycle[(index + 1) % cycle.length];
    // The person gives their own property and receives the next person's property.
    return {
      listingId: person.id,
      ownerName: person.ownerName,
      amount: (person.reviewedValue as number) - (next.reviewedValue as number)
    };
  });
}

function bootLimitsSatisfied(cycle: Listing[], boots: Boot[]): boolean {
  return boots.every((boot, i) => {
    const wants = cycle[i].wants;
    if (boot.amount > 0 && wants.maxCashToPay !== undefined &&
        boot.amount > wants.maxCashToPay) return false;
    if (boot.amount < 0 && wants.maxCashToReceive !== undefined &&
        Math.abs(boot.amount) > wants.maxCashToReceive) return false;
    return true;
  });
}

function canonicalKey(ids: string[]): string {
  // A cycle and its rotation are the same cycle; reverse direction is not necessarily valid.
  const rotations = ids.map((_, i) => [...ids.slice(i), ...ids.slice(0, i)].join("|"));
  return rotations.sort()[0];
}

export function findMatches(
  allListings: Listing[],
  options: MatcherOptions = {}
): Match[] {
  const radiusKm = options.radiusKm ?? 50;
  const maxCycles = options.maxCycles ?? 500;
  const listings = eligible(allListings);
  const byId = new Map(listings.map((p) => [p.id, p]));
  const adjacency = new Map<string, Array<{ id: string; distance: number }>>();

  for (const a of listings) {
    const edges: Array<{ id: string; distance: number }> = [];
    for (const b of listings) {
      if (a.id === b.id) continue;
      const distance = edgeDistance(a, b, radiusKm);
      if (distance !== null) edges.push({ id: b.id, distance });
    }
    adjacency.set(a.id, edges);
  }

  const found = new Map<string, Match>();

  for (const start of listings) {
    const walk = (path: string[]) => {
      if (found.size >= maxCycles) return;
      const current = path[path.length - 1]!;
      for (const edge of adjacency.get(current) ?? []) {
        if (edge.id === path[0] && path.length >= 2) {
          const cycle = path.map((id) => byId.get(id)!);
          const boots = makeBoots(cycle);
          const sum = boots.reduce((total, b) => total + b.amount, 0);
          if (Math.abs(sum) > 0.01 || !bootLimitsSatisfied(cycle, boots)) continue;

          const key = canonicalKey(path);
          if (found.has(key)) continue;

          const distances = path.map((id, i) => {
            const nextId = path[(i + 1) % path.length]!;
            return (adjacency.get(id) ?? []).find((e) => e.id === nextId)!.distance;
          });
          const totalAbsoluteBoot = boots.reduce((s, b) => s + Math.abs(b.amount), 0);
          const listingIds = [...path];
          const id = `match-${listingIds.slice().sort().join("-")}`;
          found.set(key, {
            id,
            listingIds,
            cycle: [...path, path[0]!],
            partyCount: path.length,
            boots,
            totalAbsoluteBoot,
            locationScoreKm: distances.reduce((s, d) => s + d, 0),
            status: "proposed",
            responses: Object.fromEntries(listingIds.map((listingId) => [listingId, "pending"])),
            createdAt: new Date().toISOString()
          });
          continue;
        }

        if (path.length >= 3 || path.includes(edge.id)) continue;
        // Keep start as the smallest ID to avoid exploring every rotation.
        if (edge.id < path[0]!) continue;
        walk([...path, edge.id]);
      }
    };
    walk([start.id]);
  }

  return [...found.values()].sort((a, b) =>
    a.locationScoreKm - b.locationScoreKm ||
    a.totalAbsoluteBoot - b.totalAbsoluteBoot ||
    a.partyCount - b.partyCount
  );
}
