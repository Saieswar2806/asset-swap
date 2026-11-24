import { describe, expect, it } from "vitest";
import { findMatches, eligible, makeBoots, getCanonicalMatchId, canonicalKey, roundCurrency } from "../src/matcher.js";
import { MatchWorkflow } from "../src/workflow.js";
import { toSqFt, locationDistanceKm, resolveCoordinates } from "../src/location.js";
import { calculateMatchScore } from "../src/scoring.js";
import type { Listing, PropertyType } from "../src/types.js";
import { seedListings } from "../src/data/listings.js";

function helperListing(
  id: string,
  ownerName: string,
  propertyType: PropertyType,
  value: number,
  wantedTypes: PropertyType[],
  district: string = "Ramanagara",
  locality: string = "Harohalli",
  overrides: Partial<Listing> = {}
): Listing {
  return {
    id,
    ownerId: `OWNER-${id}`,
    ownerName,
    category: "real_estate",
    propertyType,
    district,
    locality,
    area: 2000,
    areaUnit: "sq_ft",
    ownerDeclaredValue: value,
    reviewedValue: value,
    status: "reviewed",
    locked: false,
    wants: {
      propertyTypes: wantedTypes,
      preferredLocations: [district, locality],
      maxCashToPay: 10000000,
      maxCashToReceive: 10000000,
      ...overrides.wants
    },
    ...overrides
  };
}

describe("Asset Swap Core Matching Engine & Workflow Audit Tests", () => {
  // Test 1: Successful direct asset exchange and transfer direction
  it("1. Successful direct asset exchange (2-party A ↔ B) with correct transfer direction", () => {
    // Person A owns agricultural land valued at ₹2 Cr, wants a farmhouse.
    // Person B owns a farmhouse valued at ₹2 Cr, wants agricultural land.
    const personA = helperListing("A", "Person A", "agricultural_land", 20000000, ["farmhouse"], "Ramanagara", "Harohalli");
    const personB = helperListing("B", "Person B", "farmhouse", 20000000, ["agricultural_land"], "Ramanagara", "Kanakapura");

    const matches = findMatches([personA, personB]);
    expect(matches).toHaveLength(1);

    const match = matches[0];
    expect(match.partyCount).toBe(2);
    expect(match.cycle).toEqual(["A", "B", "A"]);
    expect(match.listingIds).toEqual(["A", "B"]);

    // Cash settlement: ₹0
    expect(match.totalAbsoluteBoot).toBe(0);
    expect(match.boots[0].amount).toBe(0);
    expect(match.boots[0].action).toBe("settled");
    expect(match.boots[1].amount).toBe(0);
    expect(match.boots[1].action).toBe("settled");

    // Correct Transfer Legs:
    // Person A gives their own agricultural land (Asset A) to Person B
    const legA = match.exchangeLegs.find((leg) => leg.fromListingId === "A")!;
    expect(legA.fromOwnerName).toBe("Person A");
    expect(legA.toListingId).toBe("B");
    expect(legA.toOwnerName).toBe("Person B");
    expect(legA.transferredAssetId).toBe("A");
    expect(legA.transferredPropertyType).toBe("agricultural_land");
    expect(legA.assetValue).toBe(20000000);

    // Person B gives their own farmhouse (Asset B) to Person A
    const legB = match.exchangeLegs.find((leg) => leg.fromListingId === "B")!;
    expect(legB.fromOwnerName).toBe("Person B");
    expect(legB.toListingId).toBe("A");
    expect(legB.toOwnerName).toBe("Person A");
    expect(legB.transferredAssetId).toBe("B");
    expect(legB.transferredPropertyType).toBe("farmhouse");
    expect(legB.assetValue).toBe(20000000);

    // Explanation generated
    expect(match.explanation).toContain("Direct 2-party asset exchange");
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  // Test 2: Successful 3-party exchange and transfer direction
  it("2. Successful three-party exchange (A → B → C → A) with correct transfer direction", () => {
    // Person A: Commercial (₹3 Cr) -> wants residential (independent house)
    // Person B: Residential (₹2 Cr) -> wants agricultural land
    // Person C: Agricultural (₹2.5 Cr) -> wants commercial
    const personA = helperListing("A", "Person A", "commercial", 30000000, ["independent_house"], "Bengaluru", "Indiranagar");
    const personB = helperListing("B", "Person B", "independent_house", 20000000, ["agricultural_land"], "Bengaluru", "Indiranagar");
    const personC = helperListing("C", "Person C", "agricultural_land", 25000000, ["commercial"], "Bengaluru", "Indiranagar");

    const matches = findMatches([personA, personB, personC]);
    expect(matches.some((m) => m.partyCount === 3)).toBe(true);

    const match = matches.find((m) => m.partyCount === 3)!;
    expect(match.partyCount).toBe(3);

    // Verify Cycle: A -> B -> C -> A
    // In this cycle:
    // - A wants and receives B's independent house
    // - B wants and receives C's agricultural land
    // - C wants and receives A's commercial property
    //
    // Actual asset transfers:
    // - A gives their commercial property (Asset A) to C
    // - B gives their independent house (Asset B) to A
    // - C gives their agricultural land (Asset C) to B
    const transferA = match.exchangeLegs.find((l) => l.fromListingId === "A")!;
    expect(transferA.toListingId).toBe("C");
    expect(transferA.transferredAssetId).toBe("A");
    expect(transferA.transferredPropertyType).toBe("commercial");
    expect(transferA.assetValue).toBe(30000000);

    const transferB = match.exchangeLegs.find((l) => l.fromListingId === "B")!;
    expect(transferB.toListingId).toBe("A");
    expect(transferB.transferredAssetId).toBe("B");
    expect(transferB.transferredPropertyType).toBe("independent_house");
    expect(transferB.assetValue).toBe(20000000);

    const transferC = match.exchangeLegs.find((l) => l.fromListingId === "C")!;
    expect(transferC.toListingId).toBe("B");
    expect(transferC.transferredAssetId).toBe("C");
    expect(transferC.transferredPropertyType).toBe("agricultural_land");
    expect(transferC.assetValue).toBe(25000000);

    // Boot calculations:
    // A receives B (₹2 Cr) and gives A (₹3 Cr) -> A receives ₹1 Cr cash (-10,000,000)
    // B receives C (₹2.5 Cr) and gives B (₹2 Cr) -> B pays ₹0.5 Cr cash (+5,000,000)
    // C receives A (₹3 Cr) and gives C (₹2.5 Cr) -> C pays ₹0.5 Cr cash (+5,000,000)
    const bootA = match.boots.find((b) => b.listingId === "A")!;
    const bootB = match.boots.find((b) => b.listingId === "B")!;
    const bootC = match.boots.find((b) => b.listingId === "C")!;

    expect(bootA.amount).toBe(-10000000);
    expect(bootA.action).toBe("receives");
    expect(bootB.amount).toBe(5000000);
    expect(bootB.action).toBe("pays");
    expect(bootC.amount).toBe(5000000);
    expect(bootC.action).toBe("pays");

    // Total net cash across cycle = 0
    const netSum = match.boots.reduce((s, b) => s + b.amount, 0);
    expect(netSum).toBe(0);
  });

  // Test 3: Match ID Uniqueness & Direction Sensitivity
  it("3. Match ID uniqueness and rotation consistency for directed cycles", () => {
    // 2-party cycle is rotation independent
    expect(getCanonicalMatchId(["A", "B"])).toBe("match-2p-A-B");
    expect(getCanonicalMatchId(["B", "A"])).toBe("match-2p-A-B");

    // 3-party rotations produce identical IDs
    expect(getCanonicalMatchId(["A", "B", "C"])).toBe("match-3p-A-B-C");
    expect(getCanonicalMatchId(["B", "C", "A"])).toBe("match-3p-A-B-C");
    expect(getCanonicalMatchId(["C", "A", "B"])).toBe("match-3p-A-B-C");

    // Reversed 3-party cycle produces DIFFERENT ID
    expect(getCanonicalMatchId(["A", "C", "B"])).toBe("match-3p-A-C-B");
    expect(getCanonicalMatchId(["C", "B", "A"])).toBe("match-3p-A-C-B");
    expect(getCanonicalMatchId(["B", "A", "C"])).toBe("match-3p-A-C-B");

    expect(getCanonicalMatchId(["A", "B", "C"])).not.toBe(getCanonicalMatchId(["A", "C", "B"]));
  });

  // Test 4: Different directed cycles with the same participants receive different IDs
  it("4. Different directed cycles with the same participants return distinct matches with distinct IDs", () => {
    // Construct scenario where both A -> B -> C -> A and A -> C -> B -> A are valid:
    // Every participant accepts all property types in the cycle and has equal value
    const a = helperListing("A", "Person A", "commercial", 20000000, ["apartment", "plot_site"]);
    const b = helperListing("B", "Person B", "apartment", 20000000, ["commercial", "plot_site"]);
    const c = helperListing("C", "Person C", "plot_site", 20000000, ["commercial", "apartment"]);

    const matches = findMatches([a, b, c]);
    // Expect 2 distinct 3-party directed matches
    const threeParty = matches.filter((m) => m.partyCount === 3);
    expect(threeParty.length).toBe(2);

    const ids = threeParty.map((m) => m.id);
    expect(ids).toContain("match-3p-A-B-C");
    expect(ids).toContain("match-3p-A-C-B");
    expect(new Set(ids).size).toBe(2); // strictly distinct
  });

  // Test 5: Monetary precision & exact cash boot conservation
  it("5. Monetary precision strategy prevents floating-point inaccuracies", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    expect(roundCurrency(25000000.555)).toBe(25000000.56);

    const p1 = helperListing("P1", "P1", "commercial", 30000000.1, ["apartment"]);
    const p2 = helperListing("P2", "P2", "apartment", 20000000.3, ["plot_site"]);
    const p3 = helperListing("P3", "P3", "plot_site", 25000000.2, ["commercial"]);

    const boots = makeBoots([p1, p2, p3]);
    const totalBoot = roundCurrency(boots.reduce((acc, b) => acc + b.amount, 0));
    expect(totalBoot).toBe(0);
  });

  // Test 6: Invalid asset type combination returns no matches
  it("6. Invalid asset type combination returns no matches", () => {
    const personA = helperListing("A", "Person A", "farmhouse", 20000000, ["apartment"]);
    const personB = helperListing("B", "Person B", "commercial", 20000000, ["plot_site"]);

    const matches = findMatches([personA, personB]);
    expect(matches).toHaveLength(0);
  });

  // Test 7: Location boundaries and radius conditions
  it("7. Location boundary conditions: exact match, radius boundary, and out-of-bounds", () => {
    const seeker = helperListing("S", "Seeker", "apartment", 10000000, ["plot_site"], "Bengaluru", "Indiranagar", {
      latitude: 12.9784,
      longitude: 77.6408,
      wants: {
        propertyTypes: ["plot_site"],
        preferredLocations: ["Mysuru"], // district preference
        maxDistanceKm: 30
      }
    });

    const targetInDistrict = helperListing("T1", "Target 1", "plot_site", 10000000, ["apartment"], "Mysuru", "Kuvempunagar", {
      latitude: 12.2858,
      longitude: 76.6256
    });

    // District-level preference matches at 0 km
    expect(locationDistanceKm(seeker, targetInDistrict)).toBe(0);

    // Coordinate radius boundary check
    const seekerBengaluru = helperListing("S2", "Seeker 2", "apartment", 10000000, ["plot_site"], "Bengaluru", "Indiranagar", {
      latitude: 12.9784,
      longitude: 77.6408,
      wants: {
        propertyTypes: ["plot_site"],
        preferredLocations: ["NoWhereSpecial"],
        maxDistanceKm: 15
      }
    });

    const targetNear = helperListing("T2", "Target 2", "plot_site", 10000000, ["apartment"], "Bengaluru", "Whitefield", {
      latitude: 12.9698,
      longitude: 77.7500 // ~12 km away (within 15 km)
    });

    const targetFar = helperListing("T3", "Target 3", "plot_site", 10000000, ["apartment"], "Bengaluru", "Yelahanka", {
      latitude: 13.1007,
      longitude: 77.5963 // ~14 km away
    });

    const distNear = locationDistanceKm(seekerBengaluru, targetNear, 15);
    expect(distNear).not.toBeNull();
    expect(distNear).toBeLessThanOrEqual(15);

    // If seeker maxDistanceKm is reduced to 5 km, Whitefield (~12 km) is rejected
    seekerBengaluru.wants.maxDistanceKm = 5;
    expect(locationDistanceKm(seekerBengaluru, targetNear, 5)).toBeNull();

    // Unknown locality with no coordinates returns null
    const invalidLoc = helperListing("INV", "Invalid", "plot_site", 10000000, ["apartment"], "UnknownDist", "UnknownLoc", {
      latitude: undefined,
      longitude: undefined
    });
    expect(locationDistanceKm(seekerBengaluru, invalidLoc, 50)).toBeNull();
  });

  // Test 8: Minimum-area conversion and validation
  it("8. Minimum-area unit conversions (acres, guntas, sq_ft)", () => {
    expect(toSqFt(1, "acres")).toBe(43560);
    expect(toSqFt(40, "guntas")).toBe(43560);
    expect(toSqFt(1, "guntas")).toBe(1089);
    expect(toSqFt(-5, "acres")).toBe(0);
    expect(toSqFt(0, "sq_ft")).toBe(0);

    // Seeker requires minimum 2 acres (87,120 sq ft)
    const seeker = helperListing("A", "Seeker A", "apartment", 20000000, ["agricultural_land"], "Ramanagara", "Harohalli", {
      wants: {
        propertyTypes: ["agricultural_land"],
        preferredLocations: ["Harohalli"],
        minArea: 2,
        minAreaUnit: "acres"
      }
    });

    // Target 1 has only 1.5 acres (65,340 sq ft) -> REJECT
    const targetSmall = helperListing("B1", "Target Small", "agricultural_land", 20000000, ["apartment"], "Ramanagara", "Harohalli", {
      area: 1.5,
      areaUnit: "acres"
    });

    expect(findMatches([seeker, targetSmall])).toHaveLength(0);

    // Target 2 has 2.5 acres (108,900 sq ft) -> ACCEPT
    const targetLarge = helperListing("B2", "Target Large", "agricultural_land", 20000000, ["apartment"], "Ramanagara", "Harohalli", {
      area: 2.5,
      areaUnit: "acres"
    });

    expect(findMatches([seeker, targetLarge])).toHaveLength(1);
  });

  // Test 9: Unreviewed, locked, and invalid property listings excluded
  it("9. Unreviewed, locked, and invalid property listings are strictly excluded", () => {
    const valid = helperListing("V", "Valid Owner", "apartment", 10000000, ["plot_site"]);
    const draft = helperListing("D", "Draft", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", { status: "draft" });
    const underReview = helperListing("U", "Review", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", { status: "under_review" });
    const rejected = helperListing("R", "Rejected", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", { status: "rejected" });
    const zeroVal = helperListing("Z", "Zero Val", "plot_site", 0, ["apartment"], "Ramanagara", "Harohalli", { reviewedValue: 0 });
    const locked = helperListing("L", "Locked", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", { locked: true });
    const invalidArea = helperListing("IA", "Invalid Area", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", { area: 0 });

    expect(eligible([valid, draft, underReview, rejected, zeroVal, locked, invalidArea])).toEqual([valid]);
    expect(findMatches([valid, draft])).toHaveLength(0);
    expect(findMatches([valid, locked])).toHaveLength(0);
  });

  // Test 10: Duplicate listing ID detection
  it("10. Duplicate listing ID detection throws clear error in matcher and workflow", () => {
    const item1 = helperListing("DUP-1", "Owner 1", "apartment", 10000000, ["plot_site"]);
    const item2 = helperListing("DUP-1", "Owner 2", "plot_site", 10000000, ["apartment"]);

    expect(() => findMatches([item1, item2])).toThrow("Duplicate listing ID detected");
    expect(() => new MatchWorkflow([item1, item2])).toThrow("Duplicate listing ID");
  });

  // Test 11: Same owner cannot match with themselves
  it("11. Same owner cannot match with themselves", () => {
    // Owner owns both an apartment and a plot and wants to swap
    const prop1 = helperListing("P1", "Same Owner", "apartment", 10000000, ["plot_site"], "Ramanagara", "Harohalli", {
      ownerId: "OWNER-SAME"
    });
    const prop2 = helperListing("P2", "Same Owner", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", {
      ownerId: "OWNER-SAME"
    });

    expect(findMatches([prop1, prop2])).toHaveLength(0);
  });

  // Test 12: Cash limits: maxCashToPay and maxCashToReceive
  it("12. Enforcement of maxCashToPay and maxCashToReceive limits", () => {
    // A gives 20 L, receives 25 L (A pays 5 L boot).
    // B gives 25 L, receives 20 L (B receives 5 L boot).
    const a = helperListing("A", "Person A", "plot_site", 2000000, ["farmhouse"], "Ramanagara", "Harohalli", {
      wants: { propertyTypes: ["farmhouse"], preferredLocations: ["Harohalli"], maxCashToPay: 200000 } // only ₹2 L max pay!
    });
    const b = helperListing("B", "Person B", "farmhouse", 2500000, ["plot_site"], "Ramanagara", "Harohalli", {
      wants: { propertyTypes: ["plot_site"], preferredLocations: ["Harohalli"], maxCashToReceive: 1000000 }
    });

    // Exceeds maxCashToPay of A
    expect(findMatches([a, b])).toHaveLength(0);

    // Increase A's budget to ₹6 L
    a.wants.maxCashToPay = 600000;
    // But restrict B's maxCashToReceive to ₹3 L
    b.wants.maxCashToReceive = 300000;
    expect(findMatches([a, b])).toHaveLength(0);

    // Allow B to receive ₹5 L
    b.wants.maxCashToReceive = 500000;
    expect(findMatches([a, b])).toHaveLength(1);
  });

  // Test 13: Workflow safety: Proposal validation, locking, and conflicting locks
  it("13. Workflow safety: Conflicting proposals, duplicate locks, and validation", () => {
    const a = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"]);
    const b = helperListing("B", "Person B", "farmhouse", 20000000, ["plot_site"]);
    const match = findMatches([a, b])[0]!;

    const workflow = new MatchWorkflow([a, b]);
    workflow.propose(match);

    // Cannot propose a match with already locked listings
    expect(() => workflow.propose(match)).toThrow();

    // Cannot respond to a non-existent match
    expect(() => workflow.respond("invalid-match-id", "A", "accepted")).toThrow("not found");

    // Participant not in match cannot respond
    expect(() => workflow.respond(match.id, "NON_EXISTENT", "accepted")).toThrow("not a participant");

    // Participant cannot respond twice
    workflow.respond(match.id, "A", "accepted");
    expect(() => workflow.respond(match.id, "A", "accepted")).toThrow("already recorded");

    // Cannot respond to an already accepted/declined match
    workflow.respond(match.id, "B", "accepted");
    expect(workflow.getMatches().find((m) => m.id === match.id)!.status).toBe("accepted");
    expect(() => workflow.respond(match.id, "A", "declined")).toThrow("not in proposed state");
  });

  // Test 14: Workflow decline and expiration releases all locks
  it("14. Workflow decline and expiration immediately releases all locks", () => {
    const a = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"]);
    const b = helperListing("B", "Person B", "farmhouse", 20000000, ["plot_site"]);
    const match = findMatches([a, b])[0]!;

    // Case 1: Decline releases locks
    const wfDecline = new MatchWorkflow([a, b]);
    wfDecline.propose(match);
    expect(wfDecline.getListings().every((l) => l.locked)).toBe(true);

    wfDecline.respond(match.id, "A", "declined");
    expect(wfDecline.getListings().every((l) => !l.locked)).toBe(true);

    // Case 2: Expiration releases locks
    const wfExpire = new MatchWorkflow([a, b]);
    wfExpire.propose(match);
    expect(wfExpire.getListings().every((l) => l.locked)).toBe(true);

    wfExpire.expire(match.id);
    expect(wfExpire.getListings().every((l) => !l.locked)).toBe(true);
  });

  // Test 15: Match-quality scoring stays in bounds (0 - 100) and handles edge inputs
  it("15. Match-quality scoring always returns integer between 0 and 100", () => {
    const scoreNormal = calculateMatchScore({
      locationScoreKm: 0,
      totalAbsoluteBoot: 0,
      totalCycleValue: 40000000,
      partyCount: 2,
      maxRadiusKm: 50
    });
    expect(scoreNormal).toBe(100);

    const scoreThreeParty = calculateMatchScore({
      locationScoreKm: 25,
      totalAbsoluteBoot: 10000000,
      totalCycleValue: 75000000,
      partyCount: 3,
      maxRadiusKm: 50
    });
    expect(scoreThreeParty).toBeGreaterThanOrEqual(0);
    expect(scoreThreeParty).toBeLessThanOrEqual(100);

    // Defensive zero/negative handling
    expect(calculateMatchScore({ locationScoreKm: -5, totalAbsoluteBoot: 0, totalCycleValue: 0, partyCount: 0, maxRadiusKm: 0 })).toBe(0);
    expect(calculateMatchScore({ locationScoreKm: 500, totalAbsoluteBoot: 100000000, totalCycleValue: 1000000, partyCount: 2, maxRadiusKm: 10 })).toBeGreaterThanOrEqual(0);
  });

  // Test 16: Max cycles option stops searching after limit
  it("16. Matcher respects maxCycles option", () => {
    const a = helperListing("A", "Person A", "commercial", 20000000, ["apartment", "plot_site"]);
    const b = helperListing("B", "Person B", "apartment", 20000000, ["commercial", "plot_site"]);
    const c = helperListing("C", "Person C", "plot_site", 20000000, ["commercial", "apartment"]);

    const matchesAll = findMatches([a, b, c], { maxCycles: 100 });
    expect(matchesAll.length).toBeGreaterThan(1);

    const matchesLimited = findMatches([a, b, c], { maxCycles: 1 });
    expect(matchesLimited.length).toBe(1);
  });

  // Test 17: Realistic fictional dataset integration test (112 listings)
  it("17. Runs successfully on the 112+ Karnataka fictional dataset", () => {
    expect(seedListings.length).toBeGreaterThanOrEqual(100);

    const matches = findMatches(seedListings);
    expect(matches.length).toBeGreaterThan(0);

    const twoParty = matches.filter((m) => m.partyCount === 2);
    const threeParty = matches.filter((m) => m.partyCount === 3);

    expect(twoParty.length).toBeGreaterThan(0);
    expect(threeParty.length).toBeGreaterThan(0);

    // All match IDs must be unique
    const matchIds = matches.map((m) => m.id);
    expect(new Set(matchIds).size).toBe(matchIds.length);

    // Verify all matches have valid transfers, net zero boot balance, valid scores, and explanations
    for (const match of matches) {
      const netBoot = roundCurrency(match.boots.reduce((acc, b) => acc + b.amount, 0));
      expect(netBoot).toBe(0);
      expect(match.matchScore).toBeGreaterThanOrEqual(0);
      expect(match.matchScore).toBeLessThanOrEqual(100);
      expect(match.explanation.length).toBeGreaterThan(10);
      expect(match.reasons.length).toBeGreaterThan(0);
      expect(match.exchangeLegs.length).toBe(match.partyCount);

      // Verify each leg has correct giver, receiver, and transferred asset
      for (const leg of match.exchangeLegs) {
        expect(leg.fromListingId).toBe(leg.transferredAssetId);
        expect(leg.fromListingId).not.toBe(leg.toListingId);
      }
    }
  });
});
