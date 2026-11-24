import { describe, expect, it } from "vitest";
import { findMatches, eligible, makeBoots, canonicalKey } from "../src/matcher.js";
import { MatchWorkflow } from "../src/workflow.js";
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

describe("Asset Swap Core Matching Engine Test Suite", () => {
  // Test Case 1: Successful direct asset exchange
  it("1. Successful direct asset exchange (2-party A ↔ B)", () => {
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

    // Transferred properties verified
    expect(match.exchangeLegs[0].fromOwnerName).toBe("Person A");
    expect(match.exchangeLegs[0].toOwnerName).toBe("Person B");
    expect(match.exchangeLegs[0].transferredPropertyType).toBe("farmhouse");

    // Explanation generated
    expect(match.explanation).toContain("Direct 2-party asset exchange");
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  // Test Case 2: Successful three-party exchange
  it("2. Successful three-party exchange (A → B → C → A)", () => {
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

    // Boot calculations:
    // A gives 3 Cr, receives B (2 Cr) -> A receives 1 Cr cash (-10,000,000)
    // B gives 2 Cr, receives C (2.5 Cr) -> B pays 0.5 Cr cash (+5,000,000)
    // C gives 2.5 Cr, receives A (3 Cr) -> C pays 0.5 Cr cash (+5,000,000)
    const bootA = match.boots.find((b) => b.listingId === "A")!;
    const bootB = match.boots.find((b) => b.listingId === "B")!;
    const bootC = match.boots.find((b) => b.listingId === "C")!;

    expect(bootA.amount).toBe(-10000000); // receives 1 Cr
    expect(bootA.action).toBe("receives");
    expect(bootB.amount).toBe(5000000);  // pays 50 L
    expect(bootB.action).toBe("pays");
    expect(bootC.amount).toBe(5000000);  // pays 50 L
    expect(bootC.action).toBe("pays");

    // Total cash across cycle balances to exactly 0
    const netSum = match.boots.reduce((s, b) => s + b.amount, 0);
    expect(netSum).toBe(0);
  });

  // Test Case 3: Invalid asset type combination
  it("3. Invalid asset type combination returns no matches", () => {
    // A wants apartment, but B owns commercial; B wants plot, but A owns farmhouse
    const personA = helperListing("A", "Person A", "farmhouse", 20000000, ["apartment"]);
    const personB = helperListing("B", "Person B", "commercial", 20000000, ["plot_site"]);

    const matches = findMatches([personA, personB]);
    expect(matches).toHaveLength(0);
  });

  // Test Case 4: Location incompatibility
  it("4. Location incompatibility excludes matches outside radius and preference", () => {
    // Person A in Bengaluru wants properties strictly in Bengaluru or within 20 km
    // Person B in Mysuru (distance ~140 km) wants Bengaluru properties
    const personA = helperListing("A", "Person A", "apartment", 15000000, ["plot_site"], "Bengaluru", "Indiranagar", {
      latitude: 12.9784,
      longitude: 77.6408,
      wants: {
        propertyTypes: ["plot_site"],
        preferredLocations: ["Bengaluru", "Indiranagar"],
        maxDistanceKm: 25
      }
    });

    const personB = helperListing("B", "Person B", "plot_site", 15000000, ["apartment"], "Mysuru", "Gokulam", {
      latitude: 12.3323,
      longitude: 76.6268,
      wants: {
        propertyTypes: ["apartment"],
        preferredLocations: ["Mysuru"],
        maxDistanceKm: 25
      }
    });

    // When radius is 25 km, Bengaluru to Mysuru (140 km) is rejected
    const matches = findMatches([personA, personB], { radiusKm: 25 });
    expect(matches).toHaveLength(0);
  });

  // Test Case 5: Unreviewed asset exclusion
  it("5. Unreviewed asset exclusion (draft, submitted, under_review, rejected)", () => {
    const valid = helperListing("V", "Valid Owner", "apartment", 10000000, ["plot_site"]);

    const draft = helperListing("D", "Draft Owner", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", {
      status: "draft"
    });
    const underReview = helperListing("U", "Review Owner", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", {
      status: "under_review"
    });
    const rejected = helperListing("R", "Rejected Owner", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", {
      status: "rejected"
    });
    const noValue = helperListing("N", "No Value Owner", "plot_site", 10000000, ["apartment"], "Ramanagara", "Harohalli", {
      reviewedValue: 0
    });

    expect(findMatches([valid, draft])).toHaveLength(0);
    expect(findMatches([valid, underReview])).toHaveLength(0);
    expect(findMatches([valid, rejected])).toHaveLength(0);
    expect(findMatches([valid, noValue])).toHaveLength(0);

    // Filter function directly verifies this
    expect(eligible([valid, draft, underReview, rejected, noValue])).toEqual([valid]);
  });

  // Test Case 6: Locked asset exclusion
  it("6. Locked asset exclusion", () => {
    const personA = helperListing("A", "Person A", "farmhouse", 20000000, ["plot_site"]);
    const personB = helperListing("B", "Person B", "plot_site", 20000000, ["farmhouse"], "Ramanagara", "Harohalli", {
      locked: true
    });

    const matches = findMatches([personA, personB]);
    expect(matches).toHaveLength(0);
  });

  // Test Case 7: Incorrect cash settlement limits
  it("7. Incorrect cash settlement limits rejects matches exceeding budget", () => {
    // Person A owns plot worth ₹2.0 Cr, wants farmhouse.
    // Person B owns farmhouse worth ₹2.5 Cr, wants plot.
    // Person A would receive farmhouse (₹2.5 Cr) and give plot (₹2.0 Cr), so Person A must pay ₹50 Lakhs cash boot.
    // If Person A's maxCashToPay is only ₹20 Lakhs, the exchange must be rejected!
    const personA = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"], "Ramanagara", "Harohalli", {
      wants: {
        propertyTypes: ["farmhouse"],
        preferredLocations: ["Ramanagara"],
        maxCashToPay: 2000000 // only ₹20 Lakhs, but requires ₹50 Lakhs!
      }
    });

    const personB = helperListing("B", "Person B", "farmhouse", 25000000, ["plot_site"], "Ramanagara", "Harohalli", {
      wants: {
        propertyTypes: ["plot_site"],
        preferredLocations: ["Ramanagara"],
        maxCashToReceive: 10000000
      }
    });

    expect(findMatches([personA, personB])).toHaveLength(0);

    // Similarly, if Person B's maxCashToReceive is capped below ₹50 L:
    personA.wants.maxCashToPay = 6000000; // now A can pay
    personB.wants.maxCashToReceive = 3000000; // but B cannot receive more than ₹30 Lakhs
    expect(findMatches([personA, personB])).toHaveLength(0);

    // When both limits accommodate the ₹50 L cash boot, the match succeeds:
    personB.wants.maxCashToReceive = 5000000;
    expect(findMatches([personA, personB])).toHaveLength(1);
  });

  // Test Case 8: Cash settlement balance validation
  it("8. Cash settlement balance validation (sum of cash boots in cycle == 0)", () => {
    // Multi-party cycle with different valuations
    const a = helperListing("A", "A", "commercial", 35000000, ["apartment"]);
    const b = helperListing("B", "B", "apartment", 25000000, ["plot_site"]);
    const c = helperListing("C", "C", "plot_site", 30000000, ["commercial"]);

    const matches = findMatches([a, b, c]);
    expect(matches.length).toBeGreaterThan(0);

    for (const match of matches) {
      const totalCashDifference = match.boots.reduce((acc, b) => acc + b.amount, 0);
      expect(Math.abs(totalCashDifference)).toBeLessThanOrEqual(0.001);

      // Verify each individual boot calculation
      for (let i = 0; i < match.cycle.length - 1; i++) {
        const boot = match.boots[i];
        const expectedDiff = boot.receivesValue - boot.givesValue;
        expect(boot.amount).toBe(expectedDiff);
        if (boot.amount > 0) expect(boot.action).toBe("pays");
        else if (boot.amount < 0) expect(boot.action).toBe("receives");
        else expect(boot.action).toBe("settled");
      }
    }
  });

  // Test Case 9: Duplicate exchange prevention
  it("9. Duplicate exchange prevention (rotations and reverse cycles recognized as single match)", () => {
    // A ↔ B and B ↔ A are the exact same direct asset exchange
    expect(canonicalKey(["A", "B"])).toBe(canonicalKey(["B", "A"]));

    // For 3-party, [A, B, C], [B, C, A], [C, A, B] are rotations of the exact same exchange
    expect(canonicalKey(["A", "B", "C"])).toBe(canonicalKey(["B", "C", "A"]));
    expect(canonicalKey(["B", "C", "A"])).toBe(canonicalKey(["C", "A", "B"]));

    const a = helperListing("A", "A", "commercial", 30000000, ["apartment"]);
    const b = helperListing("B", "B", "apartment", 20000000, ["plot_site"]);
    const c = helperListing("C", "C", "plot_site", 25000000, ["commercial"]);

    const matches = findMatches([a, b, c]);
    const matchIds = matches.map((m) => m.id);
    const uniqueIds = new Set(matchIds);
    expect(matchIds.length).toBe(uniqueIds.size);
  });

  // Test Case 10: Declined exchange and lock release
  it("10. Declined exchange releases locks on all participating listings", () => {
    const personA = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"]);
    const personB = helperListing("B", "Person B", "farmhouse", 20000000, ["plot_site"]);

    const match = findMatches([personA, personB])[0]!;
    const workflow = new MatchWorkflow([personA, personB]);

    // Propose match -> both listings locked
    workflow.propose(match);
    expect(workflow.getListings().every((l) => l.locked)).toBe(true);

    // Person A declines -> match becomes declined, and all locks released
    const updatedMatch = workflow.respond(match.id, "A", "declined");
    expect(updatedMatch.status).toBe("declined");
    expect(workflow.getListings().every((l) => !l.locked)).toBe(true);
  });

  // Test Case 11: Unanimous acceptance
  it("11. Unanimous acceptance transitions match to accepted and retains locks", () => {
    const personA = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"]);
    const personB = helperListing("B", "Person B", "farmhouse", 20000000, ["plot_site"]);

    const match = findMatches([personA, personB])[0]!;
    const workflow = new MatchWorkflow([personA, personB]);

    workflow.propose(match);

    // First participant accepts: match remains proposed
    let currentMatch = workflow.respond(match.id, "A", "accepted");
    expect(currentMatch.status).toBe("proposed");
    expect(currentMatch.responses["A"]).toBe("accepted");
    expect(currentMatch.responses["B"]).toBe("pending");

    // Second participant accepts: match status becomes accepted
    currentMatch = workflow.respond(match.id, "B", "accepted");
    expect(currentMatch.status).toBe("accepted");
    expect(workflow.getListings().every((l) => l.locked)).toBe(true);
  });

  // Test Case 12: Assets without possible matches
  it("12. Assets without possible matches are handled gracefully", () => {
    // Solitary listings with impossible criteria
    const orphan1 = helperListing("ISO-1", "Orphan 1", "commercial", 50000000, ["farmhouse"], "Tumakuru", "Tiptur", {
      wants: {
        propertyTypes: ["farmhouse"],
        preferredLocations: ["NonExistentLocality"],
        maxDistanceKm: 1 // impossible radius
      }
    });

    const orphan2 = helperListing("ISO-2", "Orphan 2", "apartment", 6000000, ["agricultural_land"], "Chikkaballapur", "Bagepalli", {
      wants: {
        propertyTypes: ["agricultural_land"],
        preferredLocations: ["Bagepalli"],
        maxCashToPay: 0,
        maxCashToReceive: 0
      }
    });

    const matches = findMatches([orphan1, orphan2]);
    expect(matches).toHaveLength(0);

    // Together with valid pair, orphans do not interfere
    const personA = helperListing("A", "Person A", "plot_site", 20000000, ["farmhouse"]);
    const personB = helperListing("B", "Person B", "farmhouse", 20000000, ["plot_site"]);

    const mixedMatches = findMatches([orphan1, orphan2, personA, personB]);
    expect(mixedMatches).toHaveLength(1);
    expect(mixedMatches[0].listingIds).toEqual(["A", "B"]);
  });

  // Integration Test on Realistic Fictional Dataset (112 listings)
  it("Integration: Runs successfully on the 112+ Karnataka listings dataset", () => {
    expect(seedListings.length).toBeGreaterThanOrEqual(100);

    const matches = findMatches(seedListings);
    expect(matches.length).toBeGreaterThan(0);

    // Verify 2-party and 3-party exchanges found
    const twoParty = matches.filter((m) => m.partyCount === 2);
    const threeParty = matches.filter((m) => m.partyCount === 3);

    expect(twoParty.length).toBeGreaterThan(0);
    expect(threeParty.length).toBeGreaterThan(0);

    // Verify all matches have valid net zero boot balance, valid scores, and explanations
    for (const match of matches) {
      const netBoot = match.boots.reduce((acc, b) => acc + b.amount, 0);
      expect(Math.abs(netBoot)).toBeLessThanOrEqual(0.01);
      expect(match.matchScore).toBeGreaterThanOrEqual(0);
      expect(match.matchScore).toBeLessThanOrEqual(100);
      expect(match.explanation.length).toBeGreaterThan(10);
      expect(match.reasons.length).toBeGreaterThan(0);
    }
  });
});
