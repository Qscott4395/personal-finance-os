// ─── Types ────────────────────────────────────────────────────────────────────

export interface DebtEntry {
  id: number;
  name: string;
  balance: number;
  apr: number;         // e.g. 22.5 for 22.5%
  minPayment: number;
}

export type DebtStrategy = 'avalanche' | 'snowball';

export interface DebtMonthDetail {
  id: number;
  name: string;
  startBalance: number;
  interest: number;
  payment: number;
  endBalance: number;
  paidOff: boolean;
}

export interface DebtPayoffMonth {
  month: number;
  debts: DebtMonthDetail[];
  totalBalance: number;
  totalPayment: number;
  totalInterest: number;
}

export interface DebtPerDebtSummary {
  id: number;
  name: string;
  originalBalance: number;
  totalInterestPaid: number;
  payoffMonth: number;
  payoffOrder: number;
}

export interface DebtPayoffResult {
  strategy: DebtStrategy;
  timeline: DebtPayoffMonth[];
  monthsToPayoff: number;
  totalInterestPaid: number;
  debtFreeDate: string;
  perDebt: DebtPerDebtSummary[];
}

export interface DebtComparison {
  avalanche: DebtPayoffResult;
  snowball: DebtPayoffResult;
  interestSaved: number;
  monthsSaved: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortDebts(debts: DebtEntry[], strategy: DebtStrategy): DebtEntry[] {
  return [...debts].sort((a, b) => {
    if (strategy === 'avalanche') {
      return b.apr !== a.apr ? b.apr - a.apr : a.balance - b.balance;
    }
    return a.balance !== b.balance ? a.balance - b.balance : b.apr - a.apr;
  });
}

function formatDebtFreeDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Simulation ───────────────────────────────────────────────────────────────

const MAX_MONTHS = 600; // 50-year cap

export function simulatePayoff(
  debts: DebtEntry[],
  extraPayment: number,
  strategy: DebtStrategy,
): DebtPayoffResult {
  const activeDebts = debts.filter(d => d.balance > 0);
  if (activeDebts.length === 0) {
    return {
      strategy,
      timeline: [],
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      debtFreeDate: 'Debt-Free!',
      perDebt: [],
    };
  }

  const sorted = sortDebts(activeDebts, strategy);

  // Working balances keyed by id
  const balances: Record<number, number> = {};
  const interestAccum: Record<number, number> = {};
  const payoffMonths: Record<number, number> = {};
  let payoffOrder = 0;
  const perDebtOrder: Record<number, number> = {};

  for (const d of sorted) {
    balances[d.id] = d.balance;
    interestAccum[d.id] = 0;
  }

  const timeline: DebtPayoffMonth[] = [];
  let totalInterest = 0;
  let month = 0;

  // Extra pool grows as debts are paid off (their min payments roll in)
  let freedMinPayments = 0;

  while (month < MAX_MONTHS) {
    // Check if all paid off
    const remaining = sorted.filter(d => balances[d.id] > 0);
    if (remaining.length === 0) break;

    month++;
    let monthInterest = 0;
    let monthPayment = 0;
    const monthDebts: DebtMonthDetail[] = [];

    // 1. Accrue interest on all active debts
    for (const d of remaining) {
      const interest = balances[d.id] * (d.apr / 100 / 12);
      balances[d.id] += interest;
      interestAccum[d.id] += interest;
      monthInterest += interest;
    }

    // 2. Apply minimum payments
    let availableExtra = extraPayment + freedMinPayments;

    for (const d of remaining) {
      const minPay = Math.min(d.minPayment, balances[d.id]);
      balances[d.id] -= minPay;
      monthPayment += minPay;
    }

    // 3. Apply extra payment to priority debt (first remaining in sorted order)
    for (const d of remaining) {
      if (availableExtra <= 0) break;
      if (balances[d.id] <= 0) continue;

      const extra = Math.min(availableExtra, balances[d.id]);
      balances[d.id] -= extra;
      availableExtra -= extra;
      monthPayment += extra;
    }

    // 4. Record and check for payoffs
    for (const d of sorted) {
      const wasActive = balances[d.id] !== undefined;
      const startBal = wasActive
        ? (monthDebts.length > 0 ? balances[d.id] : balances[d.id]) // simplified
        : 0;
      const paidOff = wasActive && balances[d.id] <= 0.005 && !payoffMonths[d.id];
      if (paidOff) {
        balances[d.id] = 0;
        payoffMonths[d.id] = month;
        payoffOrder++;
        perDebtOrder[d.id] = payoffOrder;
        freedMinPayments += d.minPayment;
      }
    }

    // Build month detail
    for (const d of sorted) {
      monthDebts.push({
        id: d.id,
        name: d.name,
        startBalance: d.balance, // original — for chart we use endBalance
        interest: balances[d.id] !== undefined ? interestAccum[d.id] : 0,
        payment: 0, // simplified — total is tracked at month level
        endBalance: Math.max(0, Math.round(balances[d.id] * 100) / 100),
        paidOff: payoffMonths[d.id] === month,
      });
    }

    totalInterest += monthInterest;

    timeline.push({
      month,
      debts: monthDebts,
      totalBalance: Math.round(sorted.reduce((s, d) => s + Math.max(0, balances[d.id]), 0)),
      totalPayment: Math.round(monthPayment),
      totalInterest: Math.round(monthInterest),
    });
  }

  const perDebt: DebtPerDebtSummary[] = sorted.map(d => ({
    id: d.id,
    name: d.name,
    originalBalance: d.balance,
    totalInterestPaid: Math.round(interestAccum[d.id]),
    payoffMonth: payoffMonths[d.id] ?? MAX_MONTHS,
    payoffOrder: perDebtOrder[d.id] ?? sorted.length,
  }));

  return {
    strategy,
    timeline,
    monthsToPayoff: month,
    totalInterestPaid: Math.round(totalInterest),
    debtFreeDate: month >= MAX_MONTHS ? 'Never (underpaying)' : formatDebtFreeDate(month),
    perDebt: perDebt.sort((a, b) => a.payoffOrder - b.payoffOrder),
  };
}

// ─── Compare ──────────────────────────────────────────────────────────────────

export function compareStrategies(
  debts: DebtEntry[],
  extraPayment: number,
): DebtComparison {
  const avalanche = simulatePayoff(debts, extraPayment, 'avalanche');
  const snowball = simulatePayoff(debts, extraPayment, 'snowball');

  return {
    avalanche,
    snowball,
    interestSaved: snowball.totalInterestPaid - avalanche.totalInterestPaid,
    monthsSaved: snowball.monthsToPayoff - avalanche.monthsToPayoff,
  };
}
