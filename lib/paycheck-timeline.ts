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

/** Generate all paycheck dates for a calendar year */
function generatePayDates(schedule: 26 | 24): { month: number; label: string }[] {
  const dates: { month: number; label: string }[] = [];

  if (schedule === 24) {
    // Semimonthly: 1st and 15th of each month
    for (let m = 0; m < 12; m++) {
      dates.push({ month: m, label: `${MONTH_NAMES[m]} 1` });
      dates.push({ month: m, label: `${MONTH_NAMES[m]} 15` });
    }
  } else {
    // Biweekly: every 14 days starting Jan 3 (first Friday)
    const start = new Date(2025, 0, 3); // Jan 3, 2025 (Friday)
    for (let i = 0; i < 26; i++) {
      const d = new Date(start.getTime() + i * 14 * 86400000);
      const m = d.getMonth();
      dates.push({ month: m, label: `${MONTH_NAMES[m]} ${d.getDate()}` });
    }
  }

  return dates;
}

/** Determine which paycheck number we're currently on based on today's date */
function getCurrentCheckNumber(schedule: 26 | 24): number {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if (schedule === 24) {
    return month * 2 + (day >= 15 ? 2 : 1);
  } else {
    const start = new Date(2025, 0, 3);
    const diffDays = (now.getTime() - start.getTime()) / 86400000;
    return Math.min(26, Math.max(1, Math.floor(diffDays / 14) + 1));
  }
}

export function buildPaycheckTimeline(
  tax: TaxResult,
  schedule: 26 | 24,
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

  const payDates = generatePayDates(schedule);
  const currentCheckNumber = getCurrentCheckNumber(schedule);

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
