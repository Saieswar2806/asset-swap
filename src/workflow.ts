import type { Listing, Match } from "./types.js";

export class MatchWorkflow {
  private listings: Map<string, Listing>;
  private matches: Map<string, Match>;

  constructor(listings: Listing[], matches: Match[] = []) {
    // Validate that input listings do not contain duplicate IDs
    const seenIds = new Set<string>();
    for (const listing of listings) {
      if (seenIds.has(listing.id)) {
        throw new Error(`Duplicate listing ID in workflow initialization: ${listing.id}`);
      }
      seenIds.add(listing.id);
    }

    this.listings = new Map(listings.map((p) => [p.id, structuredClone(p)]));
    this.matches = new Map(matches.map((m) => [m.id, structuredClone(m)]));
  }

  getListings(): Listing[] {
    return [...this.listings.values()].map((p) => structuredClone(p));
  }

  getMatches(): Match[] {
    return [...this.matches.values()].map((m) => structuredClone(m));
  }

  /**
   * Proposes a match, locking all participating listings.
   * Safety validations:
   * 1. Match must have status "proposed"
   * 2. Match ID must not collide with an already active proposed/accepted match
   * 3. Match must have valid, unique listing IDs matching partyCount
   * 4. Match cycle must form a valid closed loop
   * 5. Every participating listing must exist, be reviewed, and not already locked
   * 6. No participating listing can already be in another active proposed match
   */
  propose(match: Match): void {
    if (!match || typeof match !== "object") {
      throw new Error("Invalid match object.");
    }

    if (match.status !== "proposed") {
      throw new Error(`Only proposed matches can be initiated (received status: ${match.status}).`);
    }

    if (!match.id || typeof match.id !== "string" || match.id.trim().length === 0) {
      throw new Error("Match must have a valid non-empty ID.");
    }

    const existingMatch = this.matches.get(match.id);
    if (existingMatch && (existingMatch.status === "proposed" || existingMatch.status === "accepted")) {
      throw new Error(`Match ${match.id} is already active in state ${existingMatch.status}.`);
    }

    if (!Array.isArray(match.listingIds) || match.listingIds.length < 2) {
      throw new Error("Match must contain at least 2 participating listing IDs.");
    }

    // Check for duplicate listing IDs within the match
    const uniqueIds = new Set(match.listingIds);
    if (uniqueIds.size !== match.listingIds.length) {
      throw new Error(`Match ${match.id} contains duplicate listing IDs.`);
    }

    if (match.partyCount !== match.listingIds.length) {
      throw new Error(
        `Match partyCount (${match.partyCount}) does not match listingIds count (${match.listingIds.length}).`
      );
    }

    // Validate cycle structure: length must be partyCount + 1, and first === last
    if (
      !Array.isArray(match.cycle) ||
      match.cycle.length !== match.partyCount + 1 ||
      match.cycle[0] !== match.cycle[match.cycle.length - 1]
    ) {
      throw new Error(`Match ${match.id} contains an invalid cycle topology.`);
    }

    // Verify all listings exist, are reviewed, and are not locked
    for (const id of match.listingIds) {
      const listing = this.listings.get(id);
      if (!listing) {
        throw new Error(`Listing ${id} does not exist in workflow registry.`);
      }
      if (listing.status !== "reviewed") {
        throw new Error(`Listing ${id} is unavailable (status: ${listing.status}, required: reviewed).`);
      }
      if (listing.locked) {
        throw new Error(`Listing ${id} is already locked in another transaction.`);
      }
    }

    // Check whether any listing is currently part of another active proposed match
    for (const active of this.matches.values()) {
      if (active.status === "proposed" && active.id !== match.id) {
        for (const id of match.listingIds) {
          if (active.listingIds.includes(id)) {
            throw new Error(
              `Listing ${id} is already participating in active proposed match ${active.id}.`
            );
          }
        }
      }
    }

    // Lock all participating listings atomically
    for (const id of match.listingIds) {
      this.listings.get(id)!.locked = true;
    }

    this.matches.set(match.id, structuredClone(match));
  }

  /**
   * Records a participant's response ("accepted" or "declined").
   * Safety validations:
   * 1. Match must exist and be in "proposed" status
   * 2. Listing must be a participant in this match
   * 3. Listing must have a pending response (cannot respond twice)
   * Behavior:
   * - If "declined": match status becomes "declined", and all asset locks are immediately released.
   * - If all participants accept: match status becomes "accepted", and locks are retained.
   */
  respond(matchId: string, listingId: string, decision: "accepted" | "declined"): Match {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found in workflow registry.`);
    }

    if (match.status !== "proposed") {
      throw new Error(
        `Match ${matchId} is not in proposed state (current status: ${match.status}). Cannot record response.`
      );
    }

    if (!(listingId in match.responses)) {
      throw new Error(`Listing ${listingId} is not a participant in match ${matchId}.`);
    }

    if (match.responses[listingId] !== "pending") {
      throw new Error(
        `Response already recorded for listing ${listingId} in match ${matchId} (${match.responses[listingId]}).`
      );
    }

    match.responses[listingId] = decision;

    if (decision === "declined") {
      match.status = "declined";
      this.releaseLocks(match);
    } else if (Object.values(match.responses).every((r) => r === "accepted")) {
      match.status = "accepted";
      // Locks remain retained for transaction execution
    }

    return structuredClone(match);
  }

  /**
   * Expires a proposed match, releasing all participating listings.
   */
  expire(matchId: string): Match {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found in workflow registry.`);
    }

    if (match.status !== "proposed") {
      throw new Error(`Match ${matchId} is not open (status: ${match.status}). Cannot expire.`);
    }

    match.status = "expired";
    this.releaseLocks(match);
    return structuredClone(match);
  }

  private releaseLocks(match: Match): void {
    for (const id of match.listingIds) {
      const listing = this.listings.get(id);
      if (listing) {
        listing.locked = false;
      }
    }
  }
}
