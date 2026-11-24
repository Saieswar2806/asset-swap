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
 * 4. Verification Baseline (10 pts): Broker-reviewed valuations.
 *
 * IMPORTANT NOTICE:
 * This score is a deterministic algorithmic compatibility metric (0–100) reflecting relative valuation
 * alignment, geographical proximity, cycle simplicity, and broker review status. It is NOT an evaluation
 * of legal title, structural soundness, or a guarantee of transaction success.
 */
export function calculateMatchScore(factors: ScoreFactors): number {
  const { locationScoreKm, totalAbsoluteBoot, totalCycleValue, partyCount, maxRadiusKm } = factors;

  // Defensive checks against invalid or NaN inputs
  if (!Number.isFinite(totalCycleValue) || totalCycleValue <= 0) return 0;
  if (!Number.isFinite(locationScoreKm) || locationScoreKm < 0) return 0;
  if (!Number.isFinite(totalAbsoluteBoot) || totalAbsoluteBoot < 0) return 0;
  if (partyCount < 2) return 0;

  // 1. Cash efficiency (0 - 45 points)
  let cashScore = 45;
  if (totalAbsoluteBoot > 0) {
    const bootRatio = Math.min(1, totalAbsoluteBoot / totalCycleValue);
    cashScore = Math.max(0, Math.round(45 * (1 - bootRatio * 1.5)));
  }

  // 2. Location proximity (0 - 35 points)
  const avgDist = locationScoreKm / partyCount;
  const radius = Number.isFinite(maxRadiusKm) && maxRadiusKm > 0 ? maxRadiusKm : 50;
  const locationScore = Math.max(0, Math.round(35 * Math.max(0, 1 - avgDist / radius)));

  // 3. Cycle simplicity (0 - 10 points)
  const simplicityScore = partyCount === 2 ? 10 : partyCount === 3 ? 7 : 5;

  // 4. Broker-reviewed verification baseline (10 points)
  const verificationScore = 10;

  const total = cashScore + locationScore + simplicityScore + verificationScore;
  return Math.min(100, Math.max(0, total));
}
