import { calculateWithdrawal, buildComparisonTable } from '../lib/withdrawal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number) => Math.round(n);

// ─── calculateWithdrawal ─────────────────────────────────────────────────────

describe('calculateWithdrawal', () => {
  test('Annual withdrawal is portfolio * rate', () => {
    const r = calculateWithdrawal(1_000_000, 4, 5, 3, 65);
    expect(r.annualWithdrawal).toBe(40_000);
    expect(r.monthlyWithdrawal).toBe($(40_000 / 12));
  });

  test('Year-by-year data starts at retirementAge', () => {
    const r = calculateWithdrawal(1_000_000, 4, 5, 3, 65);
    expect(r.yearByYear[0].age).toBe(65);
  });

  test('Year-by-year withdrawals increase with inflation', () => {
    const r = calculateWithdrawal(1_000_000, 4, 5, 3, 65);
    // Second year withdrawal should be 3% more than first
    expect(r.yearByYear[1].withdrawal).toBeGreaterThan(r.yearByYear[0].withdrawal);
  });

  test('With high return and low withdrawal, portfolio never depletes', () => {
    const r = calculateWithdrawal(1_000_000, 3, 8, 2, 65);
    expect(r.portfolioLongevityYears).toBe(Infinity);
    expect(r.depletsAtAge).toBeNull();
  });

  test('With high withdrawal and low return, portfolio eventually depletes', () => {
    const r = calculateWithdrawal(1_000_000, 8, 3, 3, 65);
    expect(r.portfolioLongevityYears).toBeLessThan(Infinity);
    expect(r.depletsAtAge).toBeGreaterThan(65);
  });

  test('End balance reflects withdrawal-then-growth order', () => {
    const r = calculateWithdrawal(1_000_000, 4, 5, 0, 65);
    // Year 1: withdraw 40k, then grow 5%
    // endBalance = (1,000,000 - 40,000) * 1.05 = 1,008,000
    expect(r.yearByYear[0].endBalance).toBe($(960_000 * 1.05));
  });

  test('Zero portfolio returns immediate depletion info', () => {
    const r = calculateWithdrawal(0, 4, 5, 3, 65);
    // Portfolio starts at 0, first iteration sees balance <= 0 and breaks
    expect(r.yearByYear).toHaveLength(0);
    expect(r.portfolioLongevityYears).toBe(0);
  });
});

// ─── annualLivingExpenses floor ──────────────────────────────────────────────

describe('annualLivingExpenses floor', () => {
  test('Withdrawal is at least annualLivingExpenses when rate-based is lower', () => {
    // 2% of 500k = 10k, but living expenses = 30k → withdrawal should be 30k
    const r = calculateWithdrawal(500_000, 2, 5, 3, 65, 30_000);
    expect(r.annualWithdrawal).toBe(30_000);
  });

  test('Withdrawal uses rate when higher than annualLivingExpenses', () => {
    // 4% of 1M = 40k, living expenses = 20k → withdrawal should be 40k
    const r = calculateWithdrawal(1_000_000, 4, 5, 3, 65, 20_000);
    expect(r.annualWithdrawal).toBe(40_000);
  });

  test('Higher floor causes faster depletion', () => {
    const low  = calculateWithdrawal(500_000, 4, 5, 3, 65);
    const high = calculateWithdrawal(500_000, 4, 5, 3, 65, 60_000);
    // The high floor forces 60k withdrawal instead of 20k
    expect(high.annualWithdrawal).toBeGreaterThanOrEqual(60_000);
    // Higher withdrawal depletes faster
    if (low.portfolioLongevityYears === Infinity) {
      expect(high.portfolioLongevityYears).toBeLessThan(Infinity);
    } else {
      expect(high.portfolioLongevityYears).toBeLessThanOrEqual(low.portfolioLongevityYears);
    }
  });
});

// ─── buildComparisonTable ────────────────────────────────────────────────────

describe('buildComparisonTable', () => {
  test('Returns one entry per rate', () => {
    const table = buildComparisonTable(1_000_000, 5, 3, 65);
    expect(table).toHaveLength(5); // default rates: [3, 3.5, 4, 4.5, 5]
  });

  test('Custom rates are used', () => {
    const rates = [3, 4, 5, 6];
    const table = buildComparisonTable(1_000_000, 5, 3, 65, rates);
    expect(table).toHaveLength(4);
    expect(table.map(t => t.rate)).toEqual(rates);
  });

  test('Higher withdrawal rate results in shorter longevity', () => {
    const table = buildComparisonTable(1_000_000, 5, 3, 65);
    // Compare 3% (index 0) with 5% (index 4)
    const low = table[0];
    const high = table[table.length - 1];
    // Lower rate should last at least as long as higher rate
    expect(low.yearsLasting).toBeGreaterThanOrEqual(high.yearsLasting);
  });

  test('Annual and monthly values are consistent', () => {
    const table = buildComparisonTable(1_000_000, 5, 3, 65);
    for (const entry of table) {
      expect(entry.monthly).toBe($(entry.annual / 12));
    }
  });

  test('Passes annualLivingExpenses through to calculateWithdrawal', () => {
    const table = buildComparisonTable(500_000, 5, 3, 65, [2, 3, 4], 50_000);
    // 2% of 500k = 10k < 50k floor, so withdrawal should be 50k
    expect(table[0].annual).toBe(50_000);
  });
});
