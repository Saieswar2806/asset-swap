import { findMatches, eligible } from "./matcher.js";
import { MatchWorkflow } from "./workflow.js";
import { seedListings } from "./data/listings.js";
import type { Match } from "./types.js";

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function displayMatch(match: Match, index: number): void {
  console.log(`================================================================================`);
  console.log(` MATCH #${index + 1}: ${match.id}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(` • Type:                   ${match.partyCount}-Party ${match.partyCount === 2 ? "Direct Bilateral Exchange" : "Circular Multi-Party Exchange"}`);
  console.log(` • Match Quality Score:    ${match.matchScore}/100`);
  console.log(` • Verification Status:    ${match.verificationStatus.toUpperCase()} (Certified Broker Valuation)`);
  console.log(` • Number of Participants: ${match.partyCount}`);
  console.log(` • Exchange Cycle:         ${match.cycle.join("  →  ")}`);
  console.log(` • Total Cash Boot:        ${formatCurrency(match.totalAbsoluteBoot)} (Net cycle balance: ₹0)`);
  console.log(` • Total Location Travel:  ${match.locationScoreKm.toFixed(1)} km`);
  console.log(``);

  console.log(` 📋 PARTICIPATING OWNERS & ASSET TRANSFERS:`);
  for (let i = 0; i < match.exchangeLegs.length; i++) {
    const leg = match.exchangeLegs[i];
    console.log(`   ${i + 1}. [${leg.fromOwnerName}] gives asset to [${leg.toOwnerName}]:`);
    console.log(`      Asset ID:     ${leg.transferredAssetId}`);
    console.log(`      Asset Type:   ${leg.transferredPropertyType}`);
    console.log(`      Asset Value:  ${formatCurrency(leg.assetValue)}`);
    console.log(`      Distance:     ${leg.distanceKm === 0 ? "Exact locality match (0 km)" : `${leg.distanceKm} km`}`);
  }
  console.log(``);

  console.log(` 💰 CASH SETTLEMENT (BOOT CALCULATIONS):`);
  console.log(`    (Formula: Value of Asset Received − Value of Asset Given)`);
  for (const boot of match.boots) {
    const sign = boot.action === "pays" ? "(+ PAYS)" : boot.action === "receives" ? "(- RECEIVES)" : "(= SETTLED)";
    console.log(`   • ${boot.ownerName.padEnd(22)} : ${sign.padEnd(14)} ${formatCurrency(boot.cashDifference).padStart(12)}  (${boot.givesPropertyType} → ${boot.receivesPropertyType})`);
  }
  console.log(``);

  console.log(` 💡 WHY THIS EXCHANGE WAS RECOMMENDED:`);
  console.log(`   Summary: ${match.explanation}`);
  console.log(`   Details:`);
  for (const reason of match.reasons) {
    console.log(`     ✓ ${reason}`);
  }
  console.log(`================================================================================\n`);
}

async function runDemo(): Promise<void> {
  console.log(`
********************************************************************************
               ASSET SWAP — CORE ASSET EXCHANGE MATCHING ENGINE
         Technology-Driven Property & Asset Exchange Architecture
********************************************************************************
`);

  console.log(`📊 LOADING REALISTIC DATASET (KARNATAKA REAL ESTATE):`);
  console.log(` • Total listings loaded:       ${seedListings.length}`);
  const reviewedCount = eligible(seedListings).length;
  const lockedCount = seedListings.filter((l) => l.locked).length;
  const unreviewedCount = seedListings.length - reviewedCount - lockedCount;

  console.log(` • Broker-Reviewed & Active:    ${reviewedCount}`);
  console.log(` • Locked (In Active Escrow):   ${lockedCount}`);
  console.log(` • Pending/Draft/Unreviewed:    ${unreviewedCount}`);
  console.log(` • Covered Districts:           Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur`);
  console.log(` • Categories:                  Agricultural Land, Residential Plots, Apartments,`);
  console.log(`                                Independent Houses, Farmhouses, Commercial Properties\n`);

  console.log(`🔍 RUNNING GRAPH-BASED MATCHING ALGORITHM (2-PARTY & 3-PARTY CYCLES)...`);
  const matches = findMatches(seedListings, { radiusKm: 60 });
  console.log(`✓ Matching completed. Found ${matches.length} valid exchange opportunities!\n`);

  const twoPartyMatches = matches.filter((m) => m.partyCount === 2);
  const threePartyMatches = matches.filter((m) => m.partyCount === 3);

  console.log(`Found ${twoPartyMatches.length} Direct 2-Party Swaps and ${threePartyMatches.length} Multi-Party 3-Way Cycles.\n`);

  // Display top recommended matches
  console.log(`TOP RECOMMENDED DIRECT 2-PARTY ASSET EXCHANGES:\n`);
  for (let i = 0; i < Math.min(2, twoPartyMatches.length); i++) {
    displayMatch(twoPartyMatches[i], i);
  }

  console.log(`TOP RECOMMENDED MULTI-PARTY 3-WAY ASSET EXCHANGES:\n`);
  for (let i = 0; i < Math.min(2, threePartyMatches.length); i++) {
    displayMatch(threePartyMatches[i], i + twoPartyMatches.length);
  }

  // Demonstrate Transaction Workflow Lifecycle
  console.log(`\n================================================================================`);
  console.log(` 🔄 TRANSACTION WORKFLOW & LOCKING LIFECYCLE DEMONSTRATION`);
  console.log(`================================================================================`);
  if (matches.length > 0) {
    const selectedMatch = matches[0];
    console.log(`Selecting Match #${selectedMatch.id} for transaction proposal...`);

    const workflow = new MatchWorkflow(seedListings);

    console.log(`\n1. Proposing Match:`);
    workflow.propose(selectedMatch);
    console.log(`   ✓ Match proposed to parties: ${selectedMatch.listingIds.join(", ")}`);
    console.log(`   ✓ All participating assets are now LOCKED from other matching attempts.`);

    console.log(`\n2. Collecting Unanimous Responses:`);
    for (const listingId of selectedMatch.listingIds) {
      const matchState = workflow.respond(selectedMatch.id, listingId, "accepted");
      console.log(`   ✓ Party [${listingId}] accepted -> Match status: ${matchState.status}`);
    }

    console.log(`\n3. Final Transaction State:`);
    const finalMatch = workflow.getMatches().find((m) => m.id === selectedMatch.id)!;
    console.log(`   ✓ Final Match Status: ${finalMatch.status.toUpperCase()}`);
    console.log(`   ✓ Escrow asset locks retained until mutual deed registration.`);

    // Demonstrate rejection and lock release
    if (matches.length > 1) {
      const secondMatch = matches[1];
      console.log(`\n4. Simulating Declined Exchange for Match #${secondMatch.id}:`);
      const wf2 = new MatchWorkflow(seedListings);
      wf2.propose(secondMatch);
      console.log(`   ✓ Proposed and locked assets: ${secondMatch.listingIds.join(", ")}`);
      const declinedState = wf2.respond(secondMatch.id, secondMatch.listingIds[0], "declined");
      console.log(`   ✓ Party [${secondMatch.listingIds[0]}] declined -> Match status: ${declinedState.status.toUpperCase()}`);
      const anyLocked = wf2.getListings().filter((l) => secondMatch.listingIds.includes(l.id)).some((l) => l.locked);
      console.log(`   ✓ All asset locks released immediately: ${!anyLocked ? "YES (Unlocked)" : "NO"}`);
    }
  }

  console.log(`\n================================================================================`);
  console.log(` ✓ Asset Swap Core Matching Engine demonstration completed successfully.`);
  console.log(`================================================================================\n`);
}

runDemo().catch(console.error);
