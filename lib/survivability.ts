// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrinityResult {
  withdrawalRate: number;
  equityPct: number;
  successRate: number; // 0-100
}

export interface MonteCarloResult {
  successRate: number;
  medianEndingBalance: number;
  medianFailureAge: number | null;
  worstCaseFailureAge: number | null;
  histogram: { binLabel: string; count: number; isFailure: boolean }[];
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
}

// ─── Trinity Study Lookup Table ───────────────────────────────────────────────
// Interpolated historical success rates for 30-year retirement periods
// Based on the Cooley/Hubbard/Walz research (1926-2009 data)
// Format: [withdrawalRate][equityPct] = successRate

const TRINITY_30YR: Record<number, Record<number, number>> = {
  3.0: { 0: 80, 25: 95, 50: 100, 75: 100, 100: 100 },
  3.5: { 0: 65, 25: 85, 50: 95,  75: 100, 100: 100 },
  4.0: { 0: 45, 25: 70, 50: 87,  75: 95,  100: 95 },
  4.5: { 0: 30, 25: 55, 50: 76,  75: 85,  100: 85 },
  5.0: { 0: 20, 25: 40, 50: 62,  75: 72,  100: 72 },
  5.5: { 0: 12, 25: 28, 50: 48,  75: 58,  100: 58 },
  6.0: { 0: 5,  25: 18, 50: 35,  75: 43,  100: 40 },
};

// Duration adjustment factors (relative to 30-year baseline)
const DURATION_FACTORS: Record<number, number> = {
  15: 1.10,  // shorter = higher success
  20: 1.06,
  25: 1.03,
  30: 1.00,
  35: 0.95,
  40: 0.90,
};

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Trinity Study Functions ──────────────────────────────────────────────────

export function getTrinitySuccessRate(
  withdrawalRate: number,
  equityPct: number,
  durationYears: number,
): number {
  // Clamp inputs
  const wr = Math.max(3, Math.min(6, withdrawalRate));
  const eq = Math.max(0, Math.min(100, equityPct));
  const dur = Math.max(15, Math.min(40, durationYears));

  // Find surrounding withdrawal rates
  const rates = Object.keys(TRINITY_30YR).map(Number).sort((a, b) => a - b);
  let wrLow = rates[0], wrHigh = rates[rates.length - 1];
  for (let i = 0; i < rates.length - 1; i++) {
    if (wr >= rates[i] && wr <= rates[i + 1]) {
      wrLow = rates[i];
      wrHigh = rates[i + 1];
      break;
    }
  }

  // Find surrounding equity allocations
  const allocs = [0, 25, 50, 75, 100];
  let eqLow = 0, eqHigh = 100;
  for (let i = 0; i < allocs.length - 1; i++) {
    if (eq >= allocs[i] && eq <= allocs[i + 1]) {
      eqLow = allocs[i];
      eqHigh = allocs[i + 1];
      break;
    }
  }

  // Bilinear interpolation
  const wrT = wrHigh !== wrLow ? (wr - wrLow) / (wrHigh - wrLow) : 0;
  const eqT = eqHigh !== eqLow ? (eq - eqLow) / (eqHigh - eqLow) : 0;

  const ll = TRINITY_30YR[wrLow]?.[eqLow] ?? 50;
  const lh = TRINITY_30YR[wrLow]?.[eqHigh] ?? 50;
  const hl = TRINITY_30YR[wrHigh]?.[eqLow] ?? 50;
  const hh = TRINITY_30YR[wrHigh]?.[eqHigh] ?? 50;

  const low = interpolate(ll, lh, eqT);
  const high = interpolate(hl, hh, eqT);
  let rate30 = interpolate(low, high, wrT);

  // Duration adjustment
  const durKeys = Object.keys(DURATION_FACTORS).map(Number).sort((a, b) => a - b);
  let durLow = durKeys[0], durHigh = durKeys[durKeys.length - 1];
  for (let i = 0; i < durKeys.length - 1; i++) {
    if (dur >= durKeys[i] && dur <= durKeys[i + 1]) {
      durLow = durKeys[i];
      durHigh = durKeys[i + 1];
      break;
    }
  }
  const durT = durHigh !== durLow ? (dur - durLow) / (durHigh - durLow) : 0;
  const factor = interpolate(DURATION_FACTORS[durLow], DURATION_FACTORS[durHigh], durT);

  return Math.max(0, Math.min(100, Math.round(rate30 * factor)));
}

export function buildTrinityHeatMap(
  durationYears: number,
  rates: number[] = [3, 3.5, 4, 4.5, 5, 5.5, 6],
  allocations: number[] = [0, 25, 50, 75, 100],
): TrinityResult[] {
  const results: TrinityResult[] = [];
  for (const rate of rates) {
    for (const eq of allocations) {
      results.push({
        withdrawalRate: rate,
        equityPct: eq,
        successRate: getTrinitySuccessRate(rate, eq, durationYears),
      });
    }
  }
  return results;
}

export function maxSafeWithdrawalRate(
  equityPct: number,
  durationYears: number,
  targetConfidence: number,
): number {
  // Binary search for the highest withdrawal rate that meets the target
  let low = 2;
  let high = 8;
  for (let i = 0; i < 20; i++) { // 20 iterations for precision
    const mid = (low + high) / 2;
    const sr = getTrinitySuccessRate(mid, equityPct, durationYears);
    if (sr >= targetConfidence) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.round(low * 4) / 4; // round to nearest 0.25
}

// ─── Monte Carlo Simulation ──────────────────────────────────────────────────

// Box-Muller transform for normal random
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloSimulation(params: {
  portfolioValue: number;
  annualWithdrawal: number;
  equityPct: number;
  inflationRate: number;
  years: number;
  runs?: number;
  equityMean?: number;    // nominal, default 0.10
  equityStdDev?: number;  // default 0.18
  bondReturn?: number;    // nominal, default 0.05
}): MonteCarloResult {
  const {
    portfolioValue,
    annualWithdrawal,
    equityPct,
    inflationRate,
    years,
    runs = 10000,
    equityMean = 0.10,
    equityStdDev = 0.18,
    bondReturn = 0.05,
  } = params;

  const eqWeight = equityPct / 100;
  const bondWeight = 1 - eqWeight;
  const inflation = inflationRate / 100;

  // Log-normal parameters for equity
  const mu = Math.log(1 + equityMean) - (equityStdDev * equityStdDev) / 2;
  const sigma = equityStdDev;

  const endingBalances: number[] = [];
  const failureAges: number[] = [];
  let successes = 0;

  for (let run = 0; run < runs; run++) {
    let balance = portfolioValue;
    let withdrawal = annualWithdrawal;
    let failed = false;

    for (let year = 0; year < years; year++) {
      if (balance <= 0) {
        failureAges.push(year);
        failed = true;
        break;
      }

      // Random equity return (log-normal)
      const eqReturn = Math.exp(mu + sigma * randomNormal()) - 1;
      const portfolioReturn = eqWeight * eqReturn + bondWeight * bondReturn;

      balance -= withdrawal;
      if (balance <= 0) {
        failureAges.push(year);
        failed = true;
        break;
      }
      balance *= (1 + portfolioReturn);

      withdrawal *= (1 + inflation);
    }

    if (!failed) {
      successes++;
      // Deflate to today's dollars so ending balances are in real terms
      const realBalance = balance / Math.pow(1 + inflation, years);
      endingBalances.push(Math.round(realBalance));
    }
  }

  // Sort ending balances for percentiles
  endingBalances.sort((a, b) => a - b);
  const pct = (p: number) => endingBalances[Math.floor(endingBalances.length * p / 100)] ?? 0;

  // Build histogram bins
  const allOutcomes = [...endingBalances, ...failureAges.map(() => 0)];
  allOutcomes.sort((a, b) => a - b);

  const maxBalance = allOutcomes[allOutcomes.length - 1] || 1;
  const binCount = 20;
  const binSize = Math.max(1, Math.ceil(maxBalance / binCount));
  const histogram: MonteCarloResult['histogram'] = [];

  // Failure bin
  const failureCount = runs - successes;
  if (failureCount > 0) {
    histogram.push({ binLabel: 'Depleted', count: failureCount, isFailure: true });
  }

  // Success bins
  for (let i = 0; i < binCount && endingBalances.length > 0; i++) {
    const binStart = i * binSize;
    const binEnd = (i + 1) * binSize;
    const count = endingBalances.filter(b => b >= binStart && b < binEnd).length;
    if (count > 0 || i < 5) {
      const label = binEnd >= 1_000_000
        ? `$${(binStart / 1_000_000).toFixed(1)}M+`
        : `$${Math.round(binStart / 1000)}K`;
      histogram.push({ binLabel: label, count, isFailure: false });
    }
  }

  // Failure ages
  failureAges.sort((a, b) => a - b);
  const medianFailureAge = failureAges.length > 0
    ? failureAges[Math.floor(failureAges.length / 2)]
    : null;
  const worstCaseFailureAge = failureAges.length > 0
    ? failureAges[0]
    : null;

  return {
    successRate: Math.round((successes / runs) * 100),
    medianEndingBalance: pct(50),
    medianFailureAge: medianFailureAge !== null ? medianFailureAge + params.years - medianFailureAge : null,
    worstCaseFailureAge: worstCaseFailureAge !== null ? worstCaseFailureAge : null,
    histogram,
    percentiles: {
      p10: pct(10),
      p25: pct(25),
      p50: pct(50),
      p75: pct(75),
      p90: pct(90),
    },
  };
}
