import { calculateTax } from '../lib/tax';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to nearest dollar for comparisons */
const $ = (n: number) => Math.round(n);

// ─── FICA ─────────────────────────────────────────────────────────────────────

describe('FICA', () => {
  test('Social Security is 6.2% of gross up to $168,600 wage base', () => {
    const low  = calculateTax(80_000, 'TX', 0);
    const high = calculateTax(300_000, 'TX', 0);

    expect($(low.socialSecurity)).toBe($(80_000 * 0.062));
    // capped at wage base
    expect($(high.socialSecurity)).toBe($(168_600 * 0.062));
  });

  test('Medicare is 1.45% of gross (no cap)', () => {
    const r = calculateTax(200_000, 'TX', 0);
    expect($(r.medicare)).toBe($(200_000 * 0.0145));
  });

  test('Traditional 401k does NOT reduce FICA base', () => {
    const without401k = calculateTax(100_000, 'TX', 0);
    const with401k    = calculateTax(100_000, 'TX', 10); // 10% = $10k contribution

    expect($(with401k.socialSecurity)).toBe($(without401k.socialSecurity));
    expect($(with401k.medicare)).toBe($(without401k.medicare));
  });

  test('Roth 401k does NOT reduce FICA base', () => {
    const without = calculateTax(100_000, 'TX', 0, 0, false);
    const withRoth = calculateTax(100_000, 'TX', 10, 0, true);

    expect($(withRoth.socialSecurity)).toBe($(without.socialSecurity));
    expect($(withRoth.medicare)).toBe($(without.medicare));
  });

  test('Medical insurance (Section 125) DOES reduce FICA base', () => {
    const without = calculateTax(100_000, 'TX', 0, 0);
    const with_   = calculateTax(100_000, 'TX', 0, 500); // $500/mo = $6k/yr

    // FICA base reduced by $6,000
    expect($(with_.socialSecurity)).toBe($(94_000 * 0.062));
    expect($(without.socialSecurity)).toBe($(100_000 * 0.062));
  });
});

// ─── Federal Tax ──────────────────────────────────────────────────────────────

describe('Federal Tax', () => {
  test('Standard deduction is $14,600 for single filer', () => {
    // Income at or below standard deduction = $0 federal tax
    const r = calculateTax(14_600, 'TX', 0);
    expect($(r.federalTax)).toBe(0);
  });

  test('Traditional 401k reduces federal taxable income', () => {
    const without = calculateTax(100_000, 'TX', 0);
    const with_   = calculateTax(100_000, 'TX', 10); // $10k pre-tax

    // with 401k should have lower federal tax
    expect(with_.federalTax).toBeLessThan(without.federalTax);
    // taxable income: 100k - 10k (401k) - 14,600 (std deduction) = 75,400
    expect($(with_.federalTaxableIncome)).toBe(75_400);
  });

  test('Roth 401k does NOT reduce federal taxable income', () => {
    const traditional = calculateTax(100_000, 'TX', 10, 0, false);
    const roth        = calculateTax(100_000, 'TX', 10, 0, true);

    expect(roth.federalTax).toBeGreaterThan(traditional.federalTax);
    // Roth: taxable = 100k - 14,600 = 85,400
    expect($(roth.federalTaxableIncome)).toBe(85_400);
  });

  test('Medical insurance reduces federal taxable income', () => {
    const without = calculateTax(100_000, 'TX', 0, 0);
    const with_   = calculateTax(100_000, 'TX', 0, 500); // $6k/yr

    expect(with_.federalTax).toBeLessThan(without.federalTax);
    // taxable: 100k - 6k (medical) - 14,600 = 79,400
    expect($(with_.federalTaxableIncome)).toBe(79_400);
  });

  test('Federal brackets are progressive — correct marginal rates', () => {
    // $25k salary: taxable = 25k - 14,600 = 10,400 → stays in 10% bracket
    const r25k  = calculateTax(25_000, 'TX', 0);
    // $80k salary: taxable = 80k - 14,600 = 65,400 → hits 22%
    const r80k  = calculateTax(80_000, 'TX', 0);
    // $200k salary: taxable = 200k - 14,600 = 185,400 → hits 24%
    const r200k = calculateTax(200_000, 'TX', 0);
    // $250k salary: taxable = 250k - 14,600 = 235,400 → hits 32%
    const r250k = calculateTax(250_000, 'TX', 0);

    expect(r25k.marginalFederalRate).toBe(0.10);
    expect(r80k.marginalFederalRate).toBe(0.22);
    expect(r200k.marginalFederalRate).toBe(0.24);
    expect(r250k.marginalFederalRate).toBe(0.32);
  });

  test('Known federal tax calculation at $100k salary, no deductions beyond standard', () => {
    // Taxable: 100,000 - 14,600 = 85,400
    // 10% on 0–11,600      = 1,160
    // 12% on 11,600–47,150 = 4,266
    // 22% on 47,150–85,400 = 8,415
    // Total = 13,841
    const r = calculateTax(100_000, 'TX', 0);
    expect($(r.federalTax)).toBe(13_841);
  });
});

// ─── State Tax ────────────────────────────────────────────────────────────────

describe('State Tax', () => {
  test('TX and FL have no state income tax', () => {
    expect(calculateTax(150_000, 'TX', 0).stateTax).toBe(0);
    expect(calculateTax(150_000, 'FL', 0).stateTax).toBe(0);
  });

  test('IL flat 4.95% on taxable income (gross minus pre-tax deductions)', () => {
    const r = calculateTax(100_000, 'IL', 10); // $10k 401k
    // taxable = 100k - 10k = 90k
    expect($(r.stateTax)).toBe($(90_000 * 0.0495));
  });

  test('CA and NY have progressive state tax (higher rate at higher income)', () => {
    const ca_low  = calculateTax(50_000, 'CA', 0);
    const ca_high = calculateTax(500_000, 'CA', 0);
    const ny_low  = calculateTax(50_000, 'NY', 0);
    const ny_high = calculateTax(500_000, 'NY', 0);

    const ca_lowRate  = ca_low.stateTax  / 50_000;
    const ca_highRate = ca_high.stateTax / 500_000;
    const ny_lowRate  = ny_low.stateTax  / 50_000;
    const ny_highRate = ny_high.stateTax / 500_000;

    expect(ca_highRate).toBeGreaterThan(ca_lowRate);
    expect(ny_highRate).toBeGreaterThan(ny_lowRate);
  });
});

// ─── Net Income ───────────────────────────────────────────────────────────────

describe('Net Income', () => {
  test('Traditional: net = gross - 401k - all taxes', () => {
    const r = calculateTax(100_000, 'IL', 6);
    const expected = r.grossIncome - r.contribution401k - r.federalTax - r.stateTax - r.totalFICA;
    expect($(r.netIncome)).toBe($(expected));
  });

  test('Roth: net = gross - all taxes - 401k (contribution comes from after-tax pay)', () => {
    const r = calculateTax(100_000, 'IL', 6, 0, true);
    const expected = r.grossIncome - r.federalTax - r.stateTax - r.totalFICA - r.contribution401k;
    expect($(r.netIncome)).toBe($(expected));
  });

  test('Roth 401k take-home is lower than traditional at same contribution %', () => {
    const traditional = calculateTax(100_000, 'IL', 6, 0, false);
    const roth        = calculateTax(100_000, 'IL', 6, 0, true);

    // Roth has higher taxes (no pre-tax deduction), so lower take-home
    expect(roth.netIncome).toBeLessThan(traditional.netIncome);
  });

  test('Monthly net income = annual / 12', () => {
    const r = calculateTax(120_000, 'CA', 8);
    expect($(r.monthlyNetIncome)).toBe($(r.netIncome / 12));
  });

  test('Zero salary returns all zeros', () => {
    const r = calculateTax(0, 'IL', 6);
    expect(r.grossIncome).toBe(0);
    expect(r.federalTax).toBe(0);
    expect(r.stateTax).toBe(0);
    expect(r.totalFICA).toBe(0);
    expect(r.netIncome).toBe(0);
  });

  test('Effective tax rate is total tax / gross income', () => {
    const r = calculateTax(100_000, 'IL', 0);
    const expected = (r.totalTax / r.grossIncome) * 100;
    expect(r.effectiveTaxRate).toBeCloseTo(expected, 5);
  });
});

// ─── Pre-tax Deductions ───────────────────────────────────────────────────────

describe('Pre-tax Deductions', () => {
  test('401k contribution = salary * contribution%', () => {
    const r = calculateTax(100_000, 'TX', 8);
    expect($(r.contribution401k)).toBe(8_000);
  });

  test('Medical insurance = monthly premium * 12', () => {
    const r = calculateTax(100_000, 'TX', 0, 250);
    expect($(r.medicalInsurance)).toBe(3_000);
  });

  test('totalPreTaxDeductions = 401k + medical (traditional only)', () => {
    const r = calculateTax(100_000, 'TX', 6, 200);
    expect($(r.totalPreTaxDeductions)).toBe($(r.contribution401k + r.medicalInsurance));
  });

  test('Roth 401k: totalPreTaxDeductions = medical only (not 401k)', () => {
    const r = calculateTax(100_000, 'TX', 6, 200, true);
    expect($(r.totalPreTaxDeductions)).toBe($(r.medicalInsurance));
  });
});
