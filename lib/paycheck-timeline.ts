import type { TaxResult } from './tax';

export interface PaycheckEntry {
  number: number;
  date: string;        // "Jan 10", "Jan 24", etc.
  month: number;       // 0-11
  grossPay: number;
  federalTax: number;
  stateTax: number;
  fica: number;
  contribution401k: number;
  medical: number;
  netPay: number;
}

export interface PaycheckTimeline {
  paychecks: PaycheckEntry[];
  totalChecks: number;
  ytdGross: number;
  ytdTaxes: number;
  ytdNet: number;
  remainingChecks: number;
  remainingGross: number;
  remainingNet: number;
  currentCheckNumber: number;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Generate all paycheck dates for a calendar year from a user-defined first paycheck date */
function generatePayDates(
  schedule: 26 | 24,
  firstPayDate: string, // "YYYY-MM-DD"
): { month: number; label: string; dateObj: Date }[] {
  const dates: { month: number; label: string; dateObj: Date }[] = [];

  if (schedule === 24) {
    // Semimonthly: 1st and 15th of each month
    const year = parseInt(firstPayDate.slice(0, 4), 10);
    for (let m = 0; m < 12; m++) {
      const d1 = new Date(year, m, 1);
      const d15 = new Date(year, m, 15);
      dates.push({ month: m, label: `${MONTH_NAMES[m]} 1`, dateObj: d1 });
      dates.push({ month: m, label: `${MONTH_NAMES[m]} 15`, dateObj: d15 });
    }
  } else {
    // Biweekly: every 14 days starting from firstPayDate
    const parts = firstPayDate.split('-').map(Number);
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    for (let i = 0; i < 26; i++) {
      const d = new Date(start.getTime() + i * 14 * 86400000);
      const m = d.getMonth();
      dates.push({ month: m, label: `${MONTH_NAMES[m]} ${d.getDate()}`, dateObj: d });
    }
  }

  return dates;
}

/** Determine which paycheck number we're currently on based on today's date */
function getCurrentCheckNumber(
  schedule: 26 | 24,
  firstPayDate: string,
): number {
  const now = new Date();
  now.setHours(23, 59, 59); // count today's check if it lands today

  if (schedule === 24) {
    const month = now.getMonth();
    const day = now.getDate();
    return month * 2 + (day >= 15 ? 2 : 1);
  } else {
    const parts = firstPayDate.split('-').map(Number);
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const diffDays = (now.getTime() - start.getTime()) / 86400000;
    if (diffDays < 0) return 0; // haven't received first check yet
    return Math.min(26, Math.floor(diffDays / 14) + 1);
  }
}

export function buildPaycheckTimeline(
  tax: TaxResult,
  schedule: 26 | 24,
  firstPayDate: string,
): PaycheckTimeline {
  const totalChecks = schedule;
  const perCheck = {
    gross: tax.grossIncome / totalChecks,
    federal: tax.federalTax / totalChecks,
    state: tax.stateTax / totalChecks,
    fica: tax.totalFICA / totalChecks,
    k401: tax.contribution401k / totalChecks,
    medical: tax.medicalInsurance / totalChecks,
    net: tax.netIncome / totalChecks,
  };

  const payDates = generatePayDates(schedule, firstPayDate);
  const currentCheckNumber = getCurrentCheckNumber(schedule, firstPayDate);

  const paychecks: PaycheckEntry[] = payDates.map((d, i) => ({
    number: i + 1,
    date: d.label,
    month: d.month,
    grossPay: perCheck.gross,
    federalTax: perCheck.federal,
    stateTax: perCheck.state,
    fica: perCheck.fica,
    contribution401k: perCheck.k401,
    medical: perCheck.medical,
    netPay: perCheck.net,
  }));

  const ytdChecks = Math.min(currentCheckNumber, totalChecks);
  const remainingChecks = totalChecks - ytdChecks;

  return {
    paychecks,
    totalChecks,
    ytdGross: perCheck.gross * ytdChecks,
    ytdTaxes: (perCheck.federal + perCheck.state + perCheck.fica) * ytdChecks,
    ytdNet: perCheck.net * ytdChecks,
    remainingChecks,
    remainingGross: perCheck.gross * remainingChecks,
    remainingNet: perCheck.net * remainingChecks,
    currentCheckNumber: ytdChecks,
  };
}
