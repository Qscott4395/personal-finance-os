import type { TaxResult } from './tax';

export interface MonthlySummaryRow {
  month: string;
  monthIndex: number;
  grossIncome: number;
  taxes: number;
  deductions: number; // 401k + medical
  netIncome: number;
  expenses: number;
  surplus: number;
  cumulativeSavings: number;
  isCurrent: boolean;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function buildMonthlySummary(
  tax: TaxResult,
  monthlyExpenses: number,
): MonthlySummaryRow[] {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Use flat 1/12 split to match dashboard calculations
  const monthlyGross      = tax.grossIncome / 12;
  const monthlyTaxes      = (tax.federalTax + tax.stateTax + tax.totalFICA) / 12;
  const monthlyDeductions = (tax.contribution401k + tax.medicalInsurance) / 12;
  const monthlyNet        = tax.netIncome / 12;
  const monthlySurplus    = monthlyNet - monthlyExpenses;

  let cumulative = 0;
  const rows: MonthlySummaryRow[] = [];

  for (let m = 0; m < 12; m++) {
    cumulative += monthlySurplus;

    rows.push({
      month: MONTH_NAMES[m],
      monthIndex: m,
      grossIncome: monthlyGross,
      taxes: monthlyTaxes,
      deductions: monthlyDeductions,
      netIncome: monthlyNet,
      expenses: monthlyExpenses,
      surplus: monthlySurplus,
      cumulativeSavings: cumulative,
      isCurrent: m === currentMonth,
    });
  }

  return rows;
}
