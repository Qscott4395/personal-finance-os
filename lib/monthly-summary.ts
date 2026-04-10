import type { TaxResult } from './tax';
import type { PaycheckEntry } from './paycheck-timeline';

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

  let cumulative = 0;
  const rows: MonthlySummaryRow[] = [];

  for (let m = 0; m < 12; m++) {
    const checks = monthlyPaychecks[m];
    const count = checks.length;

    const grossIncome = count * (tax.grossIncome / paychecks.length);
    const taxes = count * ((tax.federalTax + tax.stateTax + tax.totalFICA) / paychecks.length);
    const deductions = count * ((tax.contribution401k + tax.medicalInsurance) / paychecks.length);
    const netIncome = count * (tax.netIncome / paychecks.length);
    const surplus = netIncome - monthlyExpenses;
    cumulative += surplus;

    rows.push({
      month: MONTH_NAMES[m],
      monthIndex: m,
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
