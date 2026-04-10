import { calculateProjection, ProjectionInput } from '../lib/projection';

// ─── Base input ───────────────────────────────────────────────────────────────

const base: ProjectionInput = {
  salary: 100_000,
  contribution401kPct: 6,
  employerMatchRate: 100,
  employerMatchCapPct: 4,
  rothAnnual: 6_500,
  brokerageAnnual: 3_000,
  cashSavingsAnnual: 2_400,
  currentAge: 30,
  retirementAge: 65,
  annualReturnPct: 7,
  cashReturnPct: 4.5,
  salaryGrowthPct: 3,
  balance401k: 0,
  balanceRoth: 0,
  balanceBrokerage: 0,
  balanceCash: 0,
};

// ─── Data shape ───────────────────────────────────────────────────────────────

describe('Output shape', () => {
  test('Returns one data point per year inclusive (age 30 to 65 = 36 points)', () => {
    const r = calculateProjection(base);
    expect(r.data.length).toBe(36);
  });

  test('First data point is currentAge, last is retirementAge', () => {
    const r = calculateProjection(base);
    expect(r.data[0].age).toBe(30);
    expect(r.data[r.data.length - 1].age).toBe(65);
  });

  test('finalValue matches last data point totalValue', () => {
    const r = calculateProjection(base);
    expect(r.finalValue).toBe(r.data[r.data.length - 1].totalValue);
  });

  test('final401k + finalRoth + finalBrokerage + finalCash = finalValue', () => {
    const r = calculateProjection(base);
    const sum = r.final401k + r.finalRoth + r.finalBrokerage + r.finalCash;
    expect(sum).toBe(r.finalValue);
  });
});

// ─── Growth direction ─────────────────────────────────────────────────────────

describe('Growth direction', () => {
  test('Portfolio grows every year with positive return and contributions', () => {
    const r = calculateProjection(base);
    for (let i = 1; i < r.data.length; i++) {
      expect(r.data[i].totalValue).toBeGreaterThan(r.data[i - 1].totalValue);
    }
  });

  test('Higher return rate produces higher final value', () => {
    const low  = calculateProjection({ ...base, annualReturnPct: 5 });
    const high = calculateProjection({ ...base, annualReturnPct: 9 });
    expect(high.finalValue).toBeGreaterThan(low.finalValue);
  });

  test('Higher salary growth produces higher final 401k value', () => {
    const low  = calculateProjection({ ...base, salaryGrowthPct: 0 });
    const high = calculateProjection({ ...base, salaryGrowthPct: 5 });
    expect(high.final401k).toBeGreaterThan(low.final401k);
  });

  test('Earlier retirement age produces lower final value', () => {
    const early = calculateProjection({ ...base, retirementAge: 55 });
    const late  = calculateProjection({ ...base, retirementAge: 65 });
    expect(late.finalValue).toBeGreaterThan(early.finalValue);
  });

  test('Starting balances increase final value', () => {
    const without = calculateProjection(base);
    const with_   = calculateProjection({ ...base, balance401k: 50_000 });
    expect(with_.final401k).toBeGreaterThan(without.final401k);
  });
});

// ─── Bucket isolation ─────────────────────────────────────────────────────────

describe('Bucket isolation', () => {
  test('Roth-only contributions only grow the Roth bucket', () => {
    const r = calculateProjection({
      ...base,
      contribution401kPct: 0,
      brokerageAnnual: 0,
      cashSavingsAnnual: 0,
      balance401k: 0,
      balanceBrokerage: 0,
      balanceCash: 0,
    });
    expect(r.final401k).toBe(0);
    expect(r.finalBrokerage).toBe(0);
    expect(r.finalCash).toBe(0);
    expect(r.finalRoth).toBeGreaterThan(0);
  });

  test('Cash savings does not grow at investment return rate', () => {
    const cash_only = calculateProjection({
      ...base,
      contribution401kPct: 0,
      rothAnnual: 0,
      brokerageAnnual: 0,
      balance401k: 0,
      balanceRoth: 0,
      balanceBrokerage: 0,
      cashSavingsAnnual: 10_000,
      cashReturnPct: 4,
      annualReturnPct: 7,
    });

    // Cash bucket should reflect 4% growth, not 7%
    // Engine: cash = 0 * 1.04 + 10,000 = 10,000 (contributions added after growth)
    // Year 2: 10,000 * 1.04 + 10,000 = 20,400
    expect(cash_only.data[0].cashValue).toBe(10_000);
    expect(cash_only.data[1].cashValue).toBe(20_400);
  });

  test('Zero cash savings and balance = zero cash at retirement', () => {
    const r = calculateProjection({ ...base, cashSavingsAnnual: 0, balanceCash: 0 });
    expect(r.finalCash).toBe(0);
  });
});

// ─── Employer match ───────────────────────────────────────────────────────────

describe('Employer match', () => {
  test('Employer match of 0% adds nothing to 401k vs no match', () => {
    const no_match   = calculateProjection({ ...base, employerMatchRate: 0 });
    const with_match = calculateProjection({ ...base, employerMatchRate: 100 });
    expect(with_match.final401k).toBeGreaterThan(no_match.final401k);
  });

  test('Employee contributing less than match cap gets partial match', () => {
    // 2% contribution, 100% match up to 4% → employer matches 2%
    const partial = calculateProjection({ ...base, contribution401kPct: 2, employerMatchCapPct: 4 });
    // 4% contribution, 100% match up to 4% → employer matches 4%
    const full    = calculateProjection({ ...base, contribution401kPct: 4, employerMatchCapPct: 4 });
    expect(full.final401k).toBeGreaterThan(partial.final401k);
  });

  test('Contributing above the match cap does not increase employer match', () => {
    // Both contribute above 4% cap, so employer match is the same
    const r6  = calculateProjection({ ...base, contribution401kPct: 6,  employerMatchCapPct: 4, employerMatchRate: 100 });
    const r10 = calculateProjection({ ...base, contribution401kPct: 10, employerMatchCapPct: 4, employerMatchRate: 100 });

    // Employer match contribution year 1: salary * 4% * 100% = $4,000 for both
    // r10 has higher employee portion, but employer portion is capped — r10 still higher overall
    // Verify employer contribution in year 1 is capped the same
    const match6_yr1  = r6.data[0].value401k  - (100_000 * 0.06);  // approx
    const match10_yr1 = r10.data[0].value401k - (100_000 * 0.10);
    // Both employer matches ~$4,000 in year 1 (before compounding prior balance)
    expect(Math.round(match6_yr1)).toBe(Math.round(match10_yr1));
  });

  test('50% match rate correctly halves employer contribution', () => {
    const full = calculateProjection({ ...base, employerMatchRate: 100, contribution401kPct: 4, employerMatchCapPct: 4 });
    const half = calculateProjection({ ...base, employerMatchRate: 50,  contribution401kPct: 4, employerMatchCapPct: 4 });

    // Year 1, no starting balance: value401k = employee + employer
    // full: 4k employee + 4k employer = 8k (then * 1.07)
    // half: 4k employee + 2k employer = 6k (then * 1.07)
    expect(full.data[0].value401k).toBeGreaterThan(half.data[0].value401k);
    const diff = full.data[0].value401k - half.data[0].value401k;
    // Engine grows balance first then adds contributions, so with 0 starting balance:
    // full: (0 * 1.07) + 4k employee + 4k employer = 8,000
    // half: (0 * 1.07) + 4k employee + 2k employer = 6,000 → diff = 2,000
    expect(diff).toBe(2_000);
  });
});

// ─── Annual invested ──────────────────────────────────────────────────────────

describe('annualInvested', () => {
  test('Equals employee 401k + employer match + roth + brokerage + cash in year 1', () => {
    const r = calculateProjection({ ...base, salaryGrowthPct: 0 });
    const employee401k  = base.salary * (base.contribution401kPct / 100);
    const employerMatch = base.salary * Math.min(base.contribution401kPct / 100, base.employerMatchCapPct / 100) * (base.employerMatchRate / 100);
    const expected = employee401k + employerMatch + base.rothAnnual + base.brokerageAnnual + base.cashSavingsAnnual;
    expect(r.annualInvested).toBe(expected);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('currentAge === retirementAge produces 1 data point', () => {
    const r = calculateProjection({ ...base, currentAge: 65, retirementAge: 65 });
    expect(r.data.length).toBe(1);
  });

  test('Zero salary still tracks Roth and cash contributions', () => {
    const r = calculateProjection({ ...base, salary: 0 });
    expect(r.finalRoth).toBeGreaterThan(0);
    expect(r.finalCash).toBeGreaterThan(0);
    expect(r.final401k).toBe(0);
  });

  test('0% return still accumulates contributions', () => {
    const r = calculateProjection({ ...base, annualReturnPct: 0, cashReturnPct: 0, salaryGrowthPct: 0 });
    // With 0% return, final value should equal total contributions over 35 years
    expect(r.finalValue).toBeGreaterThan(0);
  });
});
