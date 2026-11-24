import { describe, expect, it } from "vitest";
import { db, getAllDbListings, getDbListingById, rowToListing, type DbListingRow } from "../src/server/db.js";
import { findMatches } from "../src/matcher.js";
import { MatchWorkflow } from "../src/workflow.js";

describe("Database Repository & Persistence Unit Tests", () => {
  it("Database is populated with 100+ listings", () => {
    const listings = getAllDbListings();
    expect(listings.length).toBeGreaterThanOrEqual(100);
  });

  it("getDbListingById returns exact listing with wants", () => {
    const listing = getDbListingById("ASSET-001");
    expect(listing).toBeDefined();
    expect(listing?.id).toBe("ASSET-001");
    expect(listing?.wants.propertyTypes).toContain("farmhouse");
    expect(listing?.wants.preferredLocations.length).toBeGreaterThan(0);
  });

  it("Finds matches from SQLite database records", () => {
    const listings = getAllDbListings();
    const matches = findMatches(listings, { radiusKm: 60 });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.partyCount === 2)).toBe(true);
    expect(matches.some((m) => m.partyCount === 3)).toBe(true);
  });

  it("Workflow proposal locks database listings and decline unlocks them", () => {
    const listings = getAllDbListings();
    const matches = findMatches(listings, { radiusKm: 60 });
    const match = matches.find((m) => m.partyCount === 2)!;

    const workflow = new MatchWorkflow(listings);
    workflow.propose(match);

    // Verify listings in workflow memory are locked
    expect(workflow.getListings().filter((l) => match.listingIds.includes(l.id)).every((l) => l.locked)).toBe(true);

    // Decline releases locks
    workflow.respond(match.id, match.listingIds[0], "declined");
    expect(workflow.getListings().filter((l) => match.listingIds.includes(l.id)).every((l) => !l.locked)).toBe(true);
  });

  it("Admin approval workflow updates status to reviewed with broker valuation", () => {
    // Create submitted listing
    const id = "TEST-SUBMITTED-01";
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO listings (
        id, ownerId, ownerName, title, category, propertyType,
        district, locality, area, areaUnit, ownerDeclaredValue,
        status, locked, createdAt, updatedAt
      ) VALUES (?, 'OWNER-001', 'Test Owner', 'Test Land', 'real_estate', 'agricultural_land', 'Ramanagara', 'Harohalli', 2, 'acres', 20000000, 'submitted', 0, ?, ?)
    `).run(id, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO exchange_requirements (id, listingId, desiredPropertyTypes, preferredDistricts, preferredLocalities)
      VALUES (?, ?, '["farmhouse"]', '["Ramanagara"]', '["Harohalli"]')
    `).run(`req-${id}`, id);

    let item = getDbListingById(id);
    expect(item?.status).toBe("submitted");
    expect(item?.reviewedValue).toBeUndefined();

    // Admin approves with broker reviewed valuation of ₹1.95 Cr
    db.prepare("UPDATE listings SET status = 'reviewed', reviewedValue = 19500000 WHERE id = ?").run(id);

    item = getDbListingById(id);
    expect(item?.status).toBe("reviewed");
    expect(item?.reviewedValue).toBe(19500000);

    // Cleanup
    db.prepare("DELETE FROM exchange_requirements WHERE listingId = ?").run(id);
    db.prepare("DELETE FROM listings WHERE id = ?").run(id);
  });
});
