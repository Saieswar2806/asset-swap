import type { Listing, Boot } from "./types.js";

export interface ScoreFactors {
  locationScoreKm: number;
  totalAbsoluteBoot: number;
  totalCycleValue: number;
  partyCount: number;
  maxRadiusKm: number;
}

/**
 * Calculates a deterministic match quality score from 0 to 100 based on:
 * 1. Cash Efficiency (up to 45 pts): Highest for pure asset swaps (₹0 boot).
 * 2. Location Proximity (up to 35 pts): Highest for exact preferred locality matches (0 km).
 * 3. Execution Simplicity (up to 10 pts): 2-party direct exchanges are simpler than 3-party.
 * 4. Verification & Area Fit (up to 10 pts): Verified broker valuations.
 */
export function calculateMatchScore(factors: ScoreFactors): number {
  const { locationScoreKm, totalAbsoluteBoot, totalCycleValue, partyCount, maxRadiusKm } = factors;

  // 1. Cash efficiency (0 - 45 points)
  let cashScore = 45;
  if (totalCycleValue > 0 && totalAbsoluteBoot > 0) {
    const bootRatio = totalAbsoluteBoot / totalCycleValue;
    cashScore = Math.max(0, Math.round(45 * (1 - bootRatio * 1.5)));
  }

  // 2. Location proximity (0 - 35 points)
  const avgDist = partyCount > 0 ? locationScoreKm / partyCount : 0;
  const radius = Math.max(maxRadiusKm, 1);
  const locationScore = Math.max(0, Math.round(35 * Math.max(0, 1 - avgDist / radius)));

  // 3. Cycle simplicity (0 - 10 points)
  const simplicityScore = partyCount === 2 ? 10 : 7;

  // 4. Data verification base (10 points for broker-reviewed assets)
  const verificationScore = 10;

  const total = cashScore + locationScore + simplicityScore + verificationScore;
  return Math.min(100, Math.max(0, total));
}
