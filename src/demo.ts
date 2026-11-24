import { findMatches } from "./matcher.js";
import { MatchWorkflow } from "./workflow.js";
import type { Listing } from "./types.js";

const listings: Listing[] = [
  {
    id: "A", ownerName: "Owner A", propertyType: "agricultural_land",
    district: "Ramanagara", locality: "Harohalli", area: 2, areaUnit: "acres",
    ownerDeclaredValue: 20000000, reviewedValue: 20000000, status: "reviewed", locked: false,
    wants: { propertyTypes: ["farmhouse"], preferredLocations: ["Ramanagara"] }
  },
  {
    id: "B", ownerName: "Owner B", propertyType: "farmhouse",
    district: "Ramanagara", locality: "Kanakapura", area: 3000, areaUnit: "sq_ft",
    ownerDeclaredValue: 22000000, reviewedValue: 22000000, status: "reviewed", locked: false,
    wants: { propertyTypes: ["plot_site"], preferredLocations: ["Ramanagara"], maxCashToPay: 5000000 }
  },
  {
    id: "C", ownerName: "Owner C", propertyType: "plot_site",
    district: "Ramanagara", locality: "Channapatna", area: 6000, areaUnit: "sq_ft",
    ownerDeclaredValue: 18000000, reviewedValue: 18000000, status: "reviewed", locked: false,
    wants: { propertyTypes: ["agricultural_land"], preferredLocations: ["Ramanagara"], maxCashToReceive: 3000000 }
  }
];

const matches = findMatches(listings);
console.log("\\nASSET SWAP — MATCH SUGGESTIONS\\n");
for (const match of matches) {
  console.log(`${match.partyCount}-party cycle: ${match.cycle.join(" -> ")}`);
  console.log("Cash boot (positive = pays, negative = receives):");
  for (const boot of match.boots) {
    console.log(`  ${boot.ownerName}: ₹${boot.amount.toLocaleString("en-IN")}`);
  }
  console.log(`Total absolute boot: ₹${match.totalAbsoluteBoot.toLocaleString("en-IN")}\\n`);
}

if (matches[0]) {
  const workflow = new MatchWorkflow(listings);
  workflow.propose(matches[0]);
  for (const id of matches[0].listingIds) {
    workflow.respond(matches[0].id, id, "accepted");
  }
  console.log("Workflow status:", workflow.getMatches()[0]?.status);
}
