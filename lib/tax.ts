// ─── Types ────────────────────────────────────────────────────────────────────

export type State = 'IL' | 'CA' | 'NY' | 'TX' | 'FL';

interface Bracket {
  min: number;
  max: number;
  rate: number;
}

// ─── 2024 Federal Brackets (Single) ───────────────────────────────────────────

const FEDERAL_BRACKETS: Bracket[] = [
  { min: 0,      max: 11600,   rate: 0.10 },
  { min: 11600,  max: 47150,   rate: 0.12 },
  { min: 47150,  max: 100525,  rate: 0.22 },
  { min: 100525, max: 191950,  rate: 0.24 },
  { min: 191950, max: 243725,  rate: 0.32 },
  { min: 243725, max: 609350,  rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

const STANDARD_DEDUCTION = 14600; // 2024, Single

// ─── FICA ──────────────────────────────────────────────────────────────────────

const SS_WAGE_BASE = 168600; // 2024 Social Security wage base
const SS_RATE      = 0.062;
const MEDICARE_RATE = 0.0145;

// ─── State Brackets ───────────────────────────────────────────────────────────

// California (Single, 2024)
const CA_BRACKETS: Bracket[] = [
  { min: 0,       max: 10756,   rate: 0.010 },
  { min: 10756,   max: 25499,   rate: 0.020 },
  { min: 25499,   max: 40245,   rate: 0.040 },
  { min: 40245,   max: 55866,   rate: 0.060 },
  { min: 55866,   max: 70606,   rate: 0.080 },
  { min: 70606,   max: 360659,  rate: 0.093 },
  { min: 360659,  max: 432787,  rate: 0.103 },
  { min: 432787,  max: 721314,  rate: 0.113 },
  { min: 721314,  max: Infinity, rate: 0.123 },
];

// New York (Single, 2024)
const NY_BRACKETS: Bracket[] = [
  { min: 0,       max: 17150,    rate: 0.0400 },
  { min: 17150,   max: 23600,    rate: 0.0450 },
  { min: 23600,   max: 27900,    rate: 0.0525 },
  { min: 27900,   max: 161550,   rate: 0.0585 },
  { min: 161550,  max: 323200,   rate: 0.0625 },
  { min: 323200,  max: 2155350,  rate: 0.0685 },
  { min: 2155350, max: Infinity, rate: 0.0965 },
];

// ─── Core Helper ──────────────────────────────────────────────────────────────

function progressiveTax(income: number, brackets: Bracket[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TaxResult {
  grossIncome: number;
  contribution401k: number;
  medicalInsurance: number;     // annual pre-tax medical premium
  totalPreTaxDeductions: number;
  federalTaxableIncome: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalFICA: number;
  totalTax: number;
  netIncome: number;
  monthlyNetIncome: number;
  effectiveTaxRate: number;    // % of gross
  marginalFederalRate: number; // decimal
}

export function calculateTax(
  salary: number,
  state: State,
  contribution401kPct: number,
  monthlyMedicalPremium: number = 0,
  isRoth401k: boolean = false,
): TaxResult {
  if (salary <= 0) {
    return {
      grossIncome: 0, contribution401k: 0, medicalInsurance: 0,
      totalPreTaxDeductions: 0, federalTaxableIncome: 0,
      federalTax: 0, stateTax: 0, socialSecurity: 0, medicare: 0,
      totalFICA: 0, totalTax: 0, netIncome: 0, monthlyNetIncome: 0,
      effectiveTaxRate: 0, marginalFederalRate: 0.10,
    };
  }

  const gross = salary;
  const contribution401k = gross * (contribution401kPct / 100);
  const medicalInsurance = monthlyMedicalPremium * 12;

  // Roth 401(k): contributions are post-tax — do NOT reduce federal/state taxable income
  // Traditional 401(k): contributions are pre-tax — reduce federal/state taxable income
  // Both: FICA is always on gross (minus Section 125 medical only)
  const preTax401k = isRoth401k ? 0 : contribution401k;
  const totalPreTaxDeductions = preTax401k + medicalInsurance;

  // Federal taxable income
  const federalTaxableIncome = Math.max(0, gross - totalPreTaxDeductions - STANDARD_DEDUCTION);
  const federalTax = progressiveTax(federalTaxableIncome, FEDERAL_BRACKETS);

  // FICA: neither traditional nor Roth 401(k) reduces FICA base; only Section 125 medical does
  const ficaBase = Math.max(0, gross - medicalInsurance);
  const socialSecurity = Math.min(ficaBase, SS_WAGE_BASE) * SS_RATE;
  const medicare       = ficaBase * MEDICARE_RATE;
  const totalFICA      = socialSecurity + medicare;

  // State taxable income
  const stateTaxableIncome = Math.max(0, gross - totalPreTaxDeductions);
  let stateTax = 0;
  switch (state) {
    case 'IL': stateTax = stateTaxableIncome * 0.0495; break;
    case 'CA': stateTax = progressiveTax(stateTaxableIncome, CA_BRACKETS); break;
    case 'NY': stateTax = progressiveTax(stateTaxableIncome, NY_BRACKETS); break;
    case 'TX':
    case 'FL': stateTax = 0; break;
  }

  const totalTax = federalTax + stateTax + totalFICA;
  // Roth 401(k): contribution comes out of after-tax pay, so subtract after taxes
  const netIncome = isRoth401k
    ? gross - totalTax - contribution401k
    : gross - totalPreTaxDeductions - totalTax;
  const monthlyNetIncome = netIncome / 12;
  const effectiveTaxRate = (totalTax / gross) * 100;

  // Marginal federal rate
  let marginalFederalRate = FEDERAL_BRACKETS[0].rate;
  for (const b of FEDERAL_BRACKETS) {
    if (federalTaxableIncome > b.min) marginalFederalRate = b.rate;
  }

  return {
    grossIncome: gross,
    contribution401k,
    medicalInsurance,
    totalPreTaxDeductions,
    federalTaxableIncome,
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    totalFICA,
    totalTax,
    netIncome,
    monthlyNetIncome,
    effectiveTaxRate,
    marginalFederalRate,
  };
}
