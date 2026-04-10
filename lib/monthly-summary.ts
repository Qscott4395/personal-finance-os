import type { TaxResult } from './tax';
import type { PaycheckEntry } from './paycheck-timeline';

export interface MonthlySummaryRow {
  month: string;
  monthIndex: number;
  checks: number;
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
  paychecks: PaycheckEntry[],
  monthlyExpenses: number,
): MonthlySummaryRow[] {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Group paychecks by month
  const monthlyPaychecks: Record<number, PaycheckEntry[]> = {};
  for (let m = 0; m < 12; m++) monthlyPaychecks[m] = [];
  for (const pc of paychecks) {
    monthlyPaychecks[pc.month].push(pc);
  }

  const perCheck = {
    gross: tax.grossIncome / paychecks.length,
    taxes: (tax.federalTax + tax.stateTax + tax.totalFICA) / paychecks.length,
    deductions: (tax.contribution401k + tax.medicalInsurance) / paychecks.length,
    net: tax.netIncome / paychecks.length,
  };

  let cumulative = 0;
  const rows: MonthlySummaryRow[] = [];

  for (let m = 0; m < 12; m++) {
    const count = monthlyPaychecks[m].length;

    const grossIncome = count * perCheck.gross;
    const taxes = count * perCheck.taxes;
    const deductions = count * perCheck.deductions;
    const netIncome = count * perCheck.net;
    const surplus = netIncome - monthlyExpenses;
    cumulative += surplus;

    rows.push({
      month: MONTH_NAMES[m],
      monthIndex: m,
      checks: count,
      grossIncome,
      taxes,
      deductions,
      netIncome,
      expenses: monthlyExpenses,
      surplus,
      cumulativeSavings: cumulative,
      isCurrent: m === currentMonth,
    });
  }

  return rows;
}
