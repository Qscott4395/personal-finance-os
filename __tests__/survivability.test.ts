import {
  getTrinitySuccessRate,
  buildTrinityHeatMap,
  maxSafeWithdrawalRate,
  runMonteCarloSimulation,
} from '../lib/survivability';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number) => Math.round(n);

// ─── getTrinitySuccessRate ───────────────────────────────────────────────────

describe('getTrinitySuccessRate', () => {
  test('Known lookup: 4% rate, 50% equity, 30yr = 87%', () => {
    expect(getTrinitySuccessRate(4, 50, 30)).toBe(87);
  });

  test('Known lookup: 3% rate, 75% equity, 30yr = 100%', () => {
    expect(getTrinitySuccessRate(3, 75, 30)).toBe(100);
  });

  test('Known lookup: 6% rate, 0% equity, 30yr = 5%', () => {
    expect(getTrinitySuccessRate(6, 0, 30)).toBe(5);
  });

  test('Lower withdrawal rate yields higher success rate', () => {
    const low = getTrinitySuccessRate(3, 50, 30);
    const high = getTrinitySuccessRate(6, 50, 30);
    expect(low).toBeGreaterThan(high);
  });

  test('Higher equity allocation generally yields higher success', () => {
    const lowEq = getTrinitySuccessRate(4, 0, 30);
    const highEq = getTrinitySuccessRate(4, 75, 30);
    expect(highEq).toBeGreaterThan(lowEq);
  });

  test('Shorter duration increases success rate (duration factor)', () => {
    const short = getTrinitySuccessRate(4, 50, 15);
    const long = getTrinitySuccessRate(4, 50, 40);
    expect(short).toBeGreaterThan(long);
  });

  test('Interpolates between table values', () => {
    // 4.25% is between 4% and 4.5% — should interpolate
    const rate = getTrinitySuccessRate(4.25, 50, 30);
    const low = getTrinitySuccessRate(4, 50, 30);
    const high = getTrinitySuccessRate(4.5, 50, 30);
    expect(rate).toBeGreaterThanOrEqual(Math.min(low, high));
    expect(rate).toBeLessThanOrEqual(Math.max(low, high));
  });

  test('Result is always 0-100', () => {
    for (const wr of [3, 4, 5, 6]) {
      for (const eq of [0, 25, 50, 75, 100]) {
        const r = getTrinitySuccessRate(wr, eq, 30);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(100);
      }
    }
  });

  test('Clamps withdrawal rate below 3 to 3', () => {
    const at3 = getTrinitySuccessRate(3, 50, 30);
    const below3 = getTrinitySuccessRate(2, 50, 30);
    expect(below3).toBe(at3);
  });

  test('Clamps withdrawal rate above 6 to 6', () => {
    const at6 = getTrinitySuccessRate(6, 50, 30);
    const above6 = getTrinitySuccessRate(8, 50, 30);
    expect(above6).toBe(at6);
  });
});

// ─── buildTrinityHeatMap ─────────────────────────────────────────────────────

describe('buildTrinityHeatMap', () => {
  test('Returns rates * allocations entries with defaults', () => {
    const map = buildTrinityHeatMap(30);
    // 7 rates * 5 allocations = 35
    expect(map).toHaveLength(35);
  });

  test('Custom rates and allocations work', () => {
    const map = buildTrinityHeatMap(30, [3, 4, 5], [0, 50, 100]);
    expect(map).toHaveLength(9);
  });

  test('Each entry has withdrawalRate, equityPct, and successRate', () => {
    const map = buildTrinityHeatMap(30);
    for (const entry of map) {
      expect(entry).toHaveProperty('withdrawalRate');
      expect(entry).toHaveProperty('equityPct');
      expect(entry).toHaveProperty('successRate');
      expect(entry.successRate).toBeGreaterThanOrEqual(0);
      expect(entry.successRate).toBeLessThanOrEqual(100);
    }
  });

  test('Grid contains expected rate/allocation combinations', () => {
    const map = buildTrinityHeatMap(30, [3, 4], [25, 75]);
    expect(map).toHaveLength(4);
    expect(map[0]).toEqual(expect.objectContaining({ withdrawalRate: 3, equityPct: 25 }));
    expect(map[1]).toEqual(expect.objectContaining({ withdrawalRate: 3, equityPct: 75 }));
    expect(map[2]).toEqual(expect.objectContaining({ withdrawalRate: 4, equityPct: 25 }));
    expect(map[3]).toEqual(expect.objectContaining({ withdrawalRate: 4, equityPct: 75 }));
  });
});

// ─── maxSafeWithdrawalRate ───────────────────────────────────────────────────

describe('maxSafeWithdrawalRate', () => {
  test('Returns a reasonable rate between 2 and 8', () => {
    const rate = maxSafeWithdrawalRate(75, 30, 90);
    expect(rate).toBeGreaterThanOrEqual(2);
    expect(rate).toBeLessThanOrEqual(8);
  });

  test('Higher confidence target yields lower safe rate', () => {
    const high = maxSafeWithdrawalRate(50, 30, 95);
    const low = maxSafeWithdrawalRate(50, 30, 50);
    expect(low).toBeGreaterThanOrEqual(high);
  });

  test('Result is rounded to nearest 0.25', () => {
    const rate = maxSafeWithdrawalRate(50, 30, 85);
    expect(rate * 4).toBe(Math.round(rate * 4));
  });

  test('Higher equity allocation allows higher withdrawal rate', () => {
    const lowEq = maxSafeWithdrawalRate(25, 30, 85);
    const highEq = maxSafeWithdrawalRate(75, 30, 85);
    expect(highEq).toBeGreaterThanOrEqual(lowEq);
  });

  test('Shorter duration allows higher withdrawal rate', () => {
    const short = maxSafeWithdrawalRate(50, 15, 90);
    const long = maxSafeWithdrawalRate(50, 40, 90);
    expect(short).toBeGreaterThanOrEqual(long);
  });
});

// ─── runMonteCarloSimulation ─────────────────────────────────────────────────

describe('runMonteCarloSimulation', () => {
  // Use small number of runs for speed in tests
  const baseParams = {
    portfolioValue: 1_000_000,
    annualWithdrawal: 40_000,
    equityPct: 60,
    inflationRate: 3,
    expectedReturn: 5,
    years: 30,
    runs: 500,
  };

  test('Success rate is between 0 and 100', () => {
    const r = runMonteCarloSimulation(baseParams);
    expect(r.successRate).toBeGreaterThanOrEqual(0);
    expect(r.successRate).toBeLessThanOrEqual(100);
  });

  test('Histogram has bins', () => {
    const r = runMonteCarloSimulation(baseParams);
    expect(r.histogram.length).toBeGreaterThan(0);
  });

  test('Percentiles exist and are ordered', () => {
    const r = runMonteCarloSimulation(baseParams);
    expect(r.percentiles).toBeDefined();
    expect(r.percentiles.p10).toBeLessThanOrEqual(r.percentiles.p25);
    expect(r.percentiles.p25).toBeLessThanOrEqual(r.percentiles.p50);
    expect(r.percentiles.p50).toBeLessThanOrEqual(r.percentiles.p75);
    expect(r.percentiles.p75).toBeLessThanOrEqual(r.percentiles.p90);
  });

  test('Conservative withdrawal (2%) has high success rate', () => {
    const r = runMonteCarloSimulation({
      ...baseParams,
      annualWithdrawal: 20_000, // 2%
      runs: 1000,
    });
    expect(r.successRate).toBeGreaterThan(80);
  });

  test('Aggressive withdrawal (10%) has lower success rate', () => {
    const conservative = runMonteCarloSimulation({
      ...baseParams,
      annualWithdrawal: 20_000,
      runs: 1000,
    });
    const aggressive = runMonteCarloSimulation({
      ...baseParams,
      annualWithdrawal: 100_000,
      runs: 1000,
    });
    expect(conservative.successRate).toBeGreaterThan(aggressive.successRate);
  });

  test('Zero portfolio value results in 0% success rate', () => {
    const r = runMonteCarloSimulation({
      ...baseParams,
      portfolioValue: 0,
      runs: 100,
    });
    expect(r.successRate).toBe(0);
  });

  test('Histogram bins are labeled', () => {
    const r = runMonteCarloSimulation(baseParams);
    for (const bin of r.histogram) {
      expect(typeof bin.binLabel).toBe('string');
      expect(typeof bin.count).toBe('number');
      expect(typeof bin.isFailure).toBe('boolean');
    }
  });

  test('Failure bins are marked as isFailure', () => {
    const r = runMonteCarloSimulation({
      ...baseParams,
      annualWithdrawal: 100_000, // high withdrawal to ensure some failures
      runs: 500,
    });
    const failureBins = r.histogram.filter(b => b.isFailure);
    if (r.successRate < 100) {
      expect(failureBins.length).toBeGreaterThan(0);
    }
  });
});
