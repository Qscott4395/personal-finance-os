import { buildPaycheckTimeline } from '../lib/paycheck-timeline';
import type { TaxResult } from '../lib/tax';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number) => Math.round(n);

/** Build a mock TaxResult for testing */
function mockTax(overrides: Partial<TaxResult> = {}): TaxResult {
  return {
    grossIncome: 120_000,
    contribution401k: 7_200,
    medicalInsurance: 3_600,
    totalPreTaxDeductions: 10_800,
    federalTaxableIncome: 94_600,
    federalTax: 15_000,
    stateTax: 5_940,
    socialSecurity: 7_440,
    medicare: 1_740,
    totalFICA: 9_180,
    totalTax: 30_120,
    netIncome: 79_080,
    monthlyNetIncome: 6_590,
    effectiveTaxRate: 25.1,
    marginalFederalRate: 0.22,
    ...overrides,
  };
}

// ─── Biweekly (26 paychecks) ─────────────────────────────────────────────────

describe('Biweekly schedule (26 paychecks)', () => {
  const tax = mockTax();
  const timeline = buildPaycheckTimeline(tax, 26, '2026-01-09');

  test('Produces exactly 26 paychecks', () => {
    expect(timeline.paychecks).toHaveLength(26);
    expect(timeline.totalChecks).toBe(26);
  });

  test('Paychecks are numbered 1 through 26', () => {
    expect(timeline.paychecks[0].number).toBe(1);
    expect(timeline.paychecks[25].number).toBe(26);
  });

  test('Each check has correct gross amount (salary / 26)', () => {
    const expectedGross = 120_000 / 26;
    for (const check of timeline.paychecks) {
      expect(check.grossPay).toBeCloseTo(expectedGross, 2);
    }
  });

  test('Each check has correct net amount (netIncome / 26)', () => {
    const expectedNet = 79_080 / 26;
    for (const check of timeline.paychecks) {
      expect(check.netPay).toBeCloseTo(expectedNet, 2);
    }
  });

  test('Federal tax per check = annual federal / 26', () => {
    const expected = 15_000 / 26;
    expect(timeline.paychecks[0].federalTax).toBeCloseTo(expected, 2);
  });

  test('401k per check = annual contribution / 26', () => {
    const expected = 7_200 / 26;
    expect(timeline.paychecks[0].contribution401k).toBeCloseTo(expected, 2);
  });

  test('Medical per check = annual medical / 26', () => {
    const expected = 3_600 / 26;
    expect(timeline.paychecks[0].medical).toBeCloseTo(expected, 2);
  });

  test('Dates are spaced 14 days apart', () => {
    // First paycheck is Jan 9, second should be Jan 23
    expect(timeline.paychecks[0].date).toBe('Jan 9');
    expect(timeline.paychecks[1].date).toBe('Jan 23');
  });
});

// ─── Semimonthly (24 paychecks) ──────────────────────────────────────────────

describe('Semimonthly schedule (24 paychecks)', () => {
  const tax = mockTax();
  const timeline = buildPaycheckTimeline(tax, 24, '2026-01-01');

  test('Produces exactly 24 paychecks', () => {
    expect(timeline.paychecks).toHaveLength(24);
    expect(timeline.totalChecks).toBe(24);
  });

  test('Paychecks are numbered 1 through 24', () => {
    expect(timeline.paychecks[0].number).toBe(1);
    expect(timeline.paychecks[23].number).toBe(24);
  });

  test('Each check has correct gross amount (salary / 24)', () => {
    const expectedGross = 120_000 / 24;
    for (const check of timeline.paychecks) {
      expect(check.grossPay).toBeCloseTo(expectedGross, 2);
    }
  });

  test('Each check has correct net amount (netIncome / 24)', () => {
    const expectedNet = 79_080 / 24;
    for (const check of timeline.paychecks) {
      expect(check.netPay).toBeCloseTo(expectedNet, 2);
    }
  });

  test('Dates are on 1st and 15th of each month', () => {
    expect(timeline.paychecks[0].date).toBe('Jan 1');
    expect(timeline.paychecks[1].date).toBe('Jan 15');
    expect(timeline.paychecks[2].date).toBe('Feb 1');
    expect(timeline.paychecks[3].date).toBe('Feb 15');
  });
});

// ─── YTD Tracking ────────────────────────────────────────────────────────────

describe('YTD tracking', () => {
  test('ytdGross = perCheck gross * currentCheckNumber', () => {
    const tax = mockTax();
    const timeline = buildPaycheckTimeline(tax, 26, '2026-01-09');
    const perCheckGross = 120_000 / 26;
    expect(timeline.ytdGross).toBeCloseTo(perCheckGross * timeline.currentCheckNumber, 0);
  });

  test('ytdNet = perCheck net * currentCheckNumber', () => {
    const tax = mockTax();
    const timeline = buildPaycheckTimeline(tax, 26, '2026-01-09');
    const perCheckNet = 79_080 / 26;
    expect(timeline.ytdNet).toBeCloseTo(perCheckNet * timeline.currentCheckNumber, 0);
  });

  test('remainingChecks + currentCheckNumber = totalChecks', () => {
    const tax = mockTax();
    const timeline = buildPaycheckTimeline(tax, 26, '2026-01-09');
    expect(timeline.remainingChecks + timeline.currentCheckNumber).toBe(26);
  });

  test('remainingGross + ytdGross approximately equals grossIncome', () => {
    const tax = mockTax();
    const timeline = buildPaycheckTimeline(tax, 26, '2026-01-09');
    expect($(timeline.remainingGross + timeline.ytdGross)).toBe($(120_000));
  });
});
