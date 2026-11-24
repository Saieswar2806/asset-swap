import { describe, expect, it } from "vitest";
import { findMatches } from "../src/matcher.js";
import type { Listing } from "../src/types.js";
import { MatchWorkflow } from "../src/workflow.js";

function listing(
  id: string, propertyType: Listing["propertyType"], value: number,
  wanted: Listing["wants"]["propertyTypes"]
): Listing {
  return {
    id, ownerName: `Owner ${id}`, propertyType, district: "Ramanagara",
    locality: "Harohalli", area: 1000, areaUnit: "sq_ft",
    ownerDeclaredValue: value, reviewedValue: value,
    status: "reviewed", locked: false,
    wants: { propertyTypes: wanted, preferredLocations: ["Ramanagara"] }
  };
}

describe("Asset Swap matching engine", () => {
  it("finds a direct 2-party swap and calculates boot", () => {
    const data = [
      listing("A", "plot_site", 200, ["farmhouse"]),
      listing("B", "farmhouse", 250, ["plot_site"])
    ];
    const matches = findMatches(data);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.partyCount).toBe(2);
    expect(matches[0]?.boots.reduce((s, b) => s + b.amount, 0)).toBe(0);
    expect(matches[0]?.boots.map((b) => b.amount).sort((a,b) => a-b)).toEqual([-50, 50]);
  });

  it("finds a 3-party cycle", () => {
    const data = [
      listing("A", "commercial", 300, ["apartment"]),
      listing("B", "plot_site", 200, ["commercial"]),
      listing("C", "apartment", 250, ["plot_site"])
    ];
    const matches = findMatches(data);
    expect(matches.some((m) => m.partyCount === 3)).toBe(true);
  });

  it("excludes unreviewed and locked listings", () => {
    const a = listing("A", "plot_site", 200, ["farmhouse"]);
    const b = listing("B", "farmhouse", 200, ["plot_site"]);
    b.status = "under_review";
    expect(findMatches([a, b])).toHaveLength(0);
    b.status = "reviewed";
    b.locked = true;
    expect(findMatches([a, b])).toHaveLength(0);
  });

  it("respects maximum cash-to-pay", () => {
    const a = listing("A", "plot_site", 200, ["farmhouse"]);
    const b = listing("B", "farmhouse", 250, ["plot_site"]);
    b.wants.maxCashToPay = 10;
    expect(findMatches([a, b])).toHaveLength(0);
  });

  it("cancels and unlocks the full match if one party declines", () => {
    const data = [
      listing("A", "plot_site", 200, ["farmhouse"]),
      listing("B", "farmhouse", 200, ["plot_site"])
    ];
    const match = findMatches(data)[0]!;
    const workflow = new MatchWorkflow(data);
    workflow.propose(match);
    workflow.respond(match.id, "A", "declined");
    expect(workflow.getMatches()[0]?.status).toBe("declined");
    expect(workflow.getListings().every((p) => !p.locked)).toBe(true);
  });

  it("marks match accepted only after every party accepts", () => {
    const data = [
      listing("A", "plot_site", 200, ["farmhouse"]),
      listing("B", "farmhouse", 200, ["plot_site"])
    ];
    const match = findMatches(data)[0]!;
    const workflow = new MatchWorkflow(data);
    workflow.propose(match);
    workflow.respond(match.id, "A", "accepted");
    expect(workflow.getMatches()[0]?.status).toBe("proposed");
    workflow.respond(match.id, "B", "accepted");
    expect(workflow.getMatches()[0]?.status).toBe("accepted");
  });
});
