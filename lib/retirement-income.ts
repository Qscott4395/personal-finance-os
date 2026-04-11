import type { State } from './tax';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetirementYearIncome {
  age: number;
  socialSecurity: number;
  pension: number;
  k401Withdrawal: number;
  rothWithdrawal: number;
  brokerageWithdrawal: number;
  cashWithdrawal: number;
  totalGross: number;
  estimatedTax: number;
  totalNet: number;
  // Remaining balances after this year's withdrawal + growth
  remaining401k: number;
  remainingRoth: number;
  remainingBrokerage: number;
  remainingCash: number;
  remainingTotal: number;
}

export interface TaxComparison {
  workingEffective: number;
  retirementEffective: number;
  savings: number; // percentage point reduction
}

// ─── Simplified Federal Tax for Retirement Income ─────────────────────────────
// Uses 2024 single-filer brackets for ordinary income

const BRACKETS: [number, number][] = [
  [11_600, 0.10],
  [47_150, 0.12],
  [100_525, 0.22],
  [191_950, 0.24],
  [243_725, 0.32],
  [609_350, 0.35],
  [Infinity, 0.37],
];

const STANDARD_DEDUCTION = 14_600;

function estimateFederalTax(ordinaryIncome: number): number {
  const taxable = Math.max(0, ordinaryIncome - STANDARD_DEDUCTION);
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of BRACKETS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, limit) - prev;
    tax += slice * rate;
    prev = limit;
  }
  return tax;
}

// ─── Waterfall Engine ─────────────────────────────────────────────────────────

export function buildRetirementIncomeWaterfall(params: {
  retirementAge: number;
  socialSecurityMonthly: number;
  pensionMonthly: number;
  balance401k: number;
  balanceRoth: number;
  balanceBrokerage: number;
  balanceCash: number;
  withdrawalRate: number; // percentage
  inflationRate: number;  // percentage
  retirementReturnRate: number; // percentage
  years: number;
  annualLivingExpenses: number; // floor — can't withdraw less than you need to live
}): RetirementYearIncome[] {
  const {
    retirementAge,
    socialSecurityMonthly,
    pensionMonthly,
    balance401k,
    balanceRoth,
    balanceBrokerage,
    balanceCash,
    withdrawalRate,
    inflationRate,
    retirementReturnRate,
    years,
    annualLivingExpenses,
  } = params;

  const inflation = inflationRate / 100;
  const retReturn = retirementReturnRate / 100;
  const totalPortfolio = balance401k + balanceRoth + balanceBrokerage + balanceCash;
  // Annual need is the greater of the %-based withdrawal or actual living expenses
  let annualNeed = Math.max(totalPortfolio * (withdrawalRate / 100), annualLivingExpenses);

  let bal401k = balance401k;
  let balRoth = balanceRoth;
  let balBrokerage = balanceBrokerage;
  let balCash = balanceCash;

  const data: RetirementYearIncome[] = [];

  for (let y = 0; y <= years; y++) {
    const age = retirementAge + y;
    const ssAnnual = socialSecurityMonthly * 12 * Math.pow(1 + inflation, y);
    const pensionAnnual = pensionMonthly * 12 * Math.pow(1 + inflation, y);

    // Guaranteed income first
    const guaranteedIncome = ssAnnual + pensionAnnual;
    const portfolioNeed = Math.max(0, annualNeed - guaranteedIncome);

    // Tax-efficient withdrawal order: Brokerage → 401k → Roth → Cash
    let remaining = portfolioNeed;
    let brokerageW = 0, k401W = 0, rothW = 0, cashW = 0;

    // 1. Brokerage (capital gains — lower tax)
    if (remaining > 0 && balBrokerage > 0) {
      brokerageW = Math.min(remaining, balBrokerage);
      balBrokerage -= brokerageW;
      remaining -= brokerageW;
    }

    // 2. 401k (ordinary income)
    if (remaining > 0 && bal401k > 0) {
      k401W = Math.min(remaining, bal401k);
      bal401k -= k401W;
      remaining -= k401W;
    }

    // 3. Cash (no growth, use as buffer)
    if (remaining > 0 && balCash > 0) {
      cashW = Math.min(remaining, balCash);
      balCash -= cashW;
      remaining -= cashW;
    }

    // 4. Roth (tax-free — save for last)
    if (remaining > 0 && balRoth > 0) {
      rothW = Math.min(remaining, balRoth);
      balRoth -= rothW;
      remaining -= rothW;
    }

    // Estimate taxes
    // SS is partially taxable (up to 85%), 401k is fully taxable, Roth is tax-free
    const taxableSS = ssAnnual * 0.85;
    const ordinaryIncome = taxableSS + pensionAnnual + k401W;
    // Brokerage gets lower long-term capital gains rate (approximate as 15%)
    const capGainsTax = brokerageW * 0.15;
    const federalTax = estimateFederalTax(ordinaryIncome) + capGainsTax;

    const totalGross = ssAnnual + pensionAnnual + brokerageW + k401W + rothW + cashW;

    // Grow remaining balances
    bal401k *= (1 + retReturn);
    balRoth *= (1 + retReturn);
    balBrokerage *= (1 + retReturn);
    // Cash grows at a lower rate (approximate savings rate)
    balCash *= (1 + Math.min(retReturn, 0.03));

    data.push({
      age,
      socialSecurity: Math.round(ssAnnual),
      pension: Math.round(pensionAnnual),
      k401Withdrawal: Math.round(k401W),
      rothWithdrawal: Math.round(rothW),
      brokerageWithdrawal: Math.round(brokerageW),
      cashWithdrawal: Math.round(cashW),
      totalGross: Math.round(totalGross),
      estimatedTax: Math.round(federalTax),
      totalNet: Math.round(totalGross - federalTax),
      remaining401k: Math.round(Math.max(0, bal401k)),
      remainingRoth: Math.round(Math.max(0, balRoth)),
      remainingBrokerage: Math.round(Math.max(0, balBrokerage)),
      remainingCash: Math.round(Math.max(0, balCash)),
      remainingTotal: Math.round(Math.max(0, bal401k + balRoth + balBrokerage + balCash)),
    });

    // Increase withdrawal need for inflation
    annualNeed *= (1 + inflation);
  }

  return data;
}

// ─── Tax Comparison ───────────────────────────────────────────────────────────

export function compareWorkingVsRetirementTax(
  workingSalary: number,
  retirementIncome: number,
): TaxComparison {
  const workingTax = estimateFederalTax(workingSalary);
  const retirementTax = estimateFederalTax(retirementIncome);

  const workingEffective = workingSalary > 0 ? (workingTax / workingSalary) * 100 : 0;
  const retirementEffective = retirementIncome > 0 ? (retirementTax / retirementIncome) * 100 : 0;

  return {
    workingEffective: Math.round(workingEffective * 10) / 10,
    retirementEffective: Math.round(retirementEffective * 10) / 10,
    savings: Math.round((workingEffective - retirementEffective) * 10) / 10,
  };
}
