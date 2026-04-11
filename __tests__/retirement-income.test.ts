import {
  buildRetirementIncomeWaterfall,
  compareWorkingVsRetirementTax,
} from '../lib/retirement-income';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number) => Math.round(n);

const baseParams = {
  retirementAge: 65,
  socialSecurityMonthly: 2_000,
  pensionMonthly: 0,
  balance401k: 500_000,
  balanceRoth: 200_000,
  balanceBrokerage: 300_000,
  balanceCash: 50_000,
  withdrawalRate: 4,
  inflationRate: 3,
  retirementReturnRate: 5,
  years: 30,
  annualLivingExpenses: 60_000,
};

// ─── buildRetirementIncomeWaterfall ──────────────────────────────────────────

describe('buildRetirementIncomeWaterfall', () => {
  test('Returns one entry per year', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    expect(data).toHaveLength(31); // inclusive: ages 65 through 95
  });

  test('First year age matches retirementAge', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    expect(data[0].age).toBe(65);
  });

  test('Last year age equals retirementAge + years (inclusive)', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    expect(data[data.length - 1].age).toBe(95);
  });

  test('Social Security is socialSecurityMonthly * 12 in year 1', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    expect(data[0].socialSecurity).toBe($(2_000 * 12));
  });

  test('Social Security grows with inflation each year', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    expect(data[1].socialSecurity).toBe($(2_000 * 12 * 1.03));
  });
});

// ─── Withdrawal order: Brokerage → 401k → Cash → Roth ───────────────────────

describe('Withdrawal order', () => {
  test('Brokerage is drawn first before 401k', () => {
    const params = {
      ...baseParams,
      balanceBrokerage: 500_000,
      balance401k: 500_000,
      balanceRoth: 0,
      balanceCash: 0,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      annualLivingExpenses: 30_000,
      withdrawalRate: 3,
    };
    const data = buildRetirementIncomeWaterfall(params);
    // With need of 30k and brokerage of 500k, year 1 should pull from brokerage only
    expect(data[0].brokerageWithdrawal).toBe(30_000);
    expect(data[0].k401Withdrawal).toBe(0);
  });

  test('401k is drawn after brokerage is depleted', () => {
    const params = {
      ...baseParams,
      balanceBrokerage: 10_000,
      balance401k: 500_000,
      balanceRoth: 0,
      balanceCash: 0,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      annualLivingExpenses: 50_000,
      withdrawalRate: 4,
    };
    const totalPortfolio = 10_000 + 500_000;
    const data = buildRetirementIncomeWaterfall(params);
    // Year 1: need = max(totalPortfolio * 4%, 50k) = 50k (since 510k*4% = 20.4k < 50k)
    // Brokerage covers 10k, then 401k covers remaining 40k
    expect(data[0].brokerageWithdrawal).toBe(10_000);
    expect(data[0].k401Withdrawal).toBe(40_000);
  });

  test('Cash is drawn before Roth', () => {
    const params = {
      ...baseParams,
      balanceBrokerage: 0,
      balance401k: 0,
      balanceRoth: 200_000,
      balanceCash: 50_000,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      annualLivingExpenses: 30_000,
      withdrawalRate: 4,
    };
    const data = buildRetirementIncomeWaterfall(params);
    // Need = max(250k * 4%, 30k) = 30k
    // Cash covers first 30k (since 50k available)
    expect(data[0].cashWithdrawal).toBe(30_000);
    expect(data[0].rothWithdrawal).toBe(0);
  });

  test('Roth is drawn last (tax-free, saved for last)', () => {
    const params = {
      ...baseParams,
      balanceBrokerage: 0,
      balance401k: 0,
      balanceRoth: 200_000,
      balanceCash: 0,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      annualLivingExpenses: 30_000,
      withdrawalRate: 4,
    };
    const data = buildRetirementIncomeWaterfall(params);
    // Only Roth available
    expect(data[0].rothWithdrawal).toBe(30_000);
  });
});

// ─── annualLivingExpenses floor ──────────────────────────────────────────────

describe('annualLivingExpenses floor', () => {
  test('Withdrawal need is at least annualLivingExpenses', () => {
    const params = {
      ...baseParams,
      balance401k: 100_000,
      balanceRoth: 0,
      balanceBrokerage: 0,
      balanceCash: 0,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      withdrawalRate: 1, // 1% of 100k = 1k, but floor = 60k
      annualLivingExpenses: 60_000,
    };
    const data = buildRetirementIncomeWaterfall(params);
    // Year 1 total withdrawal from portfolio should be 60k
    const totalW = data[0].k401Withdrawal + data[0].rothWithdrawal +
      data[0].brokerageWithdrawal + data[0].cashWithdrawal;
    expect(totalW + data[0].socialSecurity + data[0].pension).toBe(data[0].totalGross);
    expect(data[0].totalGross).toBeGreaterThanOrEqual(60_000);
  });
});

// ─── Remaining balances ──────────────────────────────────────────────────────

describe('Remaining balances', () => {
  test('Remaining total decreases or stays zero over time with withdrawals', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    // We can't guarantee strict monotonic decrease (growth may offset),
    // but total should generally trend down over 30 years
    expect(data[data.length - 1].remainingTotal).toBeLessThan(data[0].remainingTotal);
  });

  test('Remaining balances are non-negative', () => {
    const data = buildRetirementIncomeWaterfall(baseParams);
    for (const year of data) {
      expect(year.remaining401k).toBeGreaterThanOrEqual(0);
      expect(year.remainingRoth).toBeGreaterThanOrEqual(0);
      expect(year.remainingBrokerage).toBeGreaterThanOrEqual(0);
      expect(year.remainingCash).toBeGreaterThanOrEqual(0);
    }
  });

  test('remainingTotal approximately equals sum of individual remaining balances', () => {
    // NOTE: Each field is individually Math.round()'d in the source, so
    // remainingTotal = round(a+b+c+d) may differ by +-1 from round(a)+round(b)+round(c)+round(d)
    const data = buildRetirementIncomeWaterfall(baseParams);
    for (const year of data) {
      const sum = year.remaining401k + year.remainingRoth + year.remainingBrokerage + year.remainingCash;
      expect(Math.abs(year.remainingTotal - sum)).toBeLessThanOrEqual(2);
    }
  });
});

// ─── Tax estimation ──────────────────────────────────────────────────────────

describe('Tax estimation', () => {
  test('Roth withdrawals are tax-free (no tax increase from Roth alone)', () => {
    const rothOnly = buildRetirementIncomeWaterfall({
      ...baseParams,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      balance401k: 0,
      balanceBrokerage: 0,
      balanceCash: 0,
      balanceRoth: 500_000,
      annualLivingExpenses: 20_000,
      withdrawalRate: 4,
    });
    // Roth withdrawal is not counted as ordinary income, and no SS or 401k
    // The only tax would be 0 (no ordinary income above standard deduction)
    expect(rothOnly[0].estimatedTax).toBe(0);
  });

  test('401k withdrawals are taxed as ordinary income', () => {
    const k401Only = buildRetirementIncomeWaterfall({
      ...baseParams,
      socialSecurityMonthly: 0,
      pensionMonthly: 0,
      balanceBrokerage: 0,
      balanceCash: 0,
      balanceRoth: 0,
      balance401k: 1_000_000,
      annualLivingExpenses: 50_000,
      withdrawalRate: 5,
    });
    // 401k withdrawal of 50k should produce some federal tax
    expect(k401Only[0].estimatedTax).toBeGreaterThan(0);
  });

  test('Social Security is 85% taxable', () => {
    // With only SS income, tax should be based on 85% of SS
    const ssOnly = buildRetirementIncomeWaterfall({
      ...baseParams,
      socialSecurityMonthly: 3_000,
      pensionMonthly: 0,
      balance401k: 0,
      balanceBrokerage: 0,
      balanceCash: 0,
      balanceRoth: 1_000_000, // Roth is tax-free, so only SS drives tax
      withdrawalRate: 4,
      annualLivingExpenses: 36_000,
    });
    const ssAnnual = 3_000 * 12;
    const taxable85 = ssAnnual * 0.85;
    // If 85% of SS (30,600) minus standard deduction (14,600) = 16,000 taxable
    // This should produce small federal tax
    if (taxable85 > 14_600) {
      expect(ssOnly[0].estimatedTax).toBeGreaterThan(0);
    }
  });

  test('totalNet approximately equals totalGross - estimatedTax', () => {
    // NOTE: Each field is individually Math.round()'d in the source, so
    // round(gross - tax) may differ by +-1 from round(gross) - round(tax)
    const data = buildRetirementIncomeWaterfall(baseParams);
    for (const year of data) {
      expect(Math.abs(year.totalNet - (year.totalGross - year.estimatedTax))).toBeLessThanOrEqual(1);
    }
  });
});

// ─── compareWorkingVsRetirementTax ───────────────────────────────────────────

describe('compareWorkingVsRetirementTax', () => {
  test('Higher working salary produces higher effective rate', () => {
    const r = compareWorkingVsRetirementTax(150_000, 60_000);
    expect(r.workingEffective).toBeGreaterThan(r.retirementEffective);
    expect(r.savings).toBeGreaterThan(0);
  });

  test('Zero income returns zero effective rates', () => {
    const r = compareWorkingVsRetirementTax(0, 0);
    expect(r.workingEffective).toBe(0);
    expect(r.retirementEffective).toBe(0);
    expect(r.savings).toBe(0);
  });

  test('Same income produces zero savings', () => {
    const r = compareWorkingVsRetirementTax(100_000, 100_000);
    expect(r.savings).toBe(0);
  });

  test('Effective rates are reasonable (0-40%)', () => {
    const r = compareWorkingVsRetirementTax(200_000, 80_000);
    expect(r.workingEffective).toBeGreaterThan(0);
    expect(r.workingEffective).toBeLessThan(40);
    expect(r.retirementEffective).toBeGreaterThan(0);
    expect(r.retirementEffective).toBeLessThan(40);
  });
});
