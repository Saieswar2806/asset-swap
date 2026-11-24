import type { Listing, Match } from "./types.js";

export class MatchWorkflow {
  private listings: Map<string, Listing>;
  private matches: Map<string, Match>;

  constructor(listings: Listing[], matches: Match[] = []) {
    this.listings = new Map(listings.map((p) => [p.id, structuredClone(p)]));
    this.matches = new Map(matches.map((m) => [m.id, structuredClone(m)]));
  }

  getListings(): Listing[] {
    return [...this.listings.values()].map((p) => structuredClone(p));
  }

  getMatches(): Match[] {
    return [...this.matches.values()].map((m) => structuredClone(m));
  }

  propose(match: Match): void {
    if (match.status !== "proposed") throw new Error("Only proposed matches can be locked.");
    for (const id of match.listingIds) {
      const listing = this.listings.get(id);
      if (!listing || listing.status !== "reviewed" || listing.locked) {
        throw new Error(`Listing ${id} is unavailable.`);
      }
    }
    for (const id of match.listingIds) this.listings.get(id)!.locked = true;
    this.matches.set(match.id, structuredClone(match));
  }

  respond(matchId: string, listingId: string, decision: "accepted" | "declined"): Match {
    const match = this.matches.get(matchId);
    if (!match || match.status !== "proposed") throw new Error("Match is not open.");
    if (!(listingId in match.responses)) throw new Error("Listing is not part of this match.");
    if (match.responses[listingId] !== "pending") throw new Error("Response already recorded.");

    match.responses[listingId] = decision;

    if (decision === "declined") {
      match.status = "declined";
      this.releaseLocks(match);
    } else if (Object.values(match.responses).every((r) => r === "accepted")) {
      match.status = "accepted";
      // Keep listings locked after unanimous acceptance; a real transaction workflow
      // should release them only after completion or an authorized cancellation.
    }
    return structuredClone(match);
  }

  expire(matchId: string): Match {
    const match = this.matches.get(matchId);
    if (!match || match.status !== "proposed") throw new Error("Match is not open.");
    match.status = "expired";
    this.releaseLocks(match);
    return structuredClone(match);
  }

  private releaseLocks(match: Match): void {
    for (const id of match.listingIds) {
      const listing = this.listings.get(id);
      if (listing) listing.locked = false;
    }
  }
}
