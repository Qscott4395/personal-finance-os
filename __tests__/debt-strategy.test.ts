import { simulatePayoff, compareStrategies, type DebtEntry } from '../lib/debt-strategy';

const $ = (n: number) => Math.round(n);

const sampleDebts: DebtEntry[] = [
  { id: 1, name: 'Credit Cards', balance: 8_000, apr: 22.5, minPayment: 150 },
  { id: 2, name: 'Student Loans', balance: 35_000, apr: 5.5, minPayment: 300 },
  { id: 3, name: 'Other', balance: 3_000, apr: 8.0, minPayment: 50 },
];

// ─── Output shape ─────────────────────────────────────────────────────────────

describe('Output shape', () => {
  test('Returns timeline, perDebt, and summary fields', () => {
    const r = simulatePayoff(sampleDebts, 0, 'avalanche');
    expect(r.strategy).toBe('avalanche');
    expect(r.timeline.length).toBeGreaterThan(0);
    expect(r.perDebt.length).toBe(3);
    expect(r.monthsToPayoff).toBeGreaterThan(0);
    expect(r.totalInterestPaid).toBeGreaterThan(0);
    expect(typeof r.debtFreeDate).toBe('string');
  });

  test('perDebt has payoff order for each debt', () => {
    const r = simulatePayoff(sampleDebts, 0, 'avalanche');
    const orders = r.perDebt.map(d => d.payoffOrder).sort();
    expect(orders).toEqual([1, 2, 3]);
  });

  test('Empty debts returns zero result', () => {
    const r = simulatePayoff([], 0, 'avalanche');
    expect(r.monthsToPayoff).toBe(0);
    expect(r.totalInterestPaid).toBe(0);
    expect(r.timeline.length).toBe(0);
    expect(r.debtFreeDate).toBe('Debt-Free!');
  });
});

// ─── Strategy ordering ───────────────────────────────────────────────────────

describe('Strategy ordering', () => {
  test('Avalanche pays highest APR first when extra payment available', () => {
    const r = simulatePayoff(sampleDebts, 500, 'avalanche');
    // Credit Cards (22.5%) should be paid off first with $500 extra going to it
    expect(r.perDebt[0].name).toBe('Credit Cards');
  });

  test('Snowball pays lowest balance first when extra payment available', () => {
    const r = simulatePayoff(sampleDebts, 500, 'snowball');
    // Other ($3,000) should be paid off first with $500 extra going to it
    expect(r.perDebt[0].name).toBe('Other');
  });
});

// ─── Extra payment ────────────────────────────────────────────────────────────

describe('Extra payment', () => {
  test('Extra payment reduces months to payoff', () => {
    const noExtra = simulatePayoff(sampleDebts, 0, 'avalanche');
    const extra = simulatePayoff(sampleDebts, 500, 'avalanche');
    expect(extra.monthsToPayoff).toBeLessThan(noExtra.monthsToPayoff);
  });

  test('Extra payment reduces total interest', () => {
    const noExtra = simulatePayoff(sampleDebts, 0, 'avalanche');
    const extra = simulatePayoff(sampleDebts, 500, 'avalanche');
    expect(extra.totalInterestPaid).toBeLessThan(noExtra.totalInterestPaid);
  });

  test('Very large extra payment pays off quickly', () => {
    const r = simulatePayoff(sampleDebts, 10_000, 'avalanche');
    expect(r.monthsToPayoff).toBeLessThanOrEqual(6);
  });
});

// ─── Payoff cascade ──────────────────────────────────────────────────────────

describe('Payoff cascade', () => {
  test('When a debt is paid off, subsequent debts pay off faster', () => {
    // Single large debt vs two debts with same total
    const single = simulatePayoff(
      [{ id: 1, name: 'Big', balance: 10_000, apr: 10, minPayment: 200 }],
      100, 'avalanche',
    );
    const two = simulatePayoff(
      [
        { id: 1, name: 'Small', balance: 2_000, apr: 10, minPayment: 200 },
        { id: 2, name: 'Big', balance: 8_000, apr: 10, minPayment: 200 },
      ],
      100, 'snowball',
    );
    // Two debts with same total should finish sooner because small one frees up its min payment
    expect(two.monthsToPayoff).toBeLessThanOrEqual(single.monthsToPayoff);
  });
});

// ─── Compare strategies ──────────────────────────────────────────────────────

describe('Compare strategies', () => {
  test('Returns both strategies and the delta', () => {
    const c = compareStrategies(sampleDebts, 200);
    expect(c.avalanche.strategy).toBe('avalanche');
    expect(c.snowball.strategy).toBe('snowball');
    expect(typeof c.interestSaved).toBe('number');
    expect(typeof c.monthsSaved).toBe('number');
  });

  test('Avalanche saves interest vs snowball when APRs differ', () => {
    const c = compareStrategies(sampleDebts, 200);
    // Avalanche should save interest (or be equal) vs snowball
    expect(c.interestSaved).toBeGreaterThanOrEqual(0);
  });

  test('Single debt makes both strategies identical', () => {
    const c = compareStrategies(
      [{ id: 1, name: 'Only', balance: 5_000, apr: 15, minPayment: 100 }],
      50,
    );
    expect(c.interestSaved).toBe(0);
    expect(c.monthsSaved).toBe(0);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('Zero balance debts are skipped', () => {
    const r = simulatePayoff(
      [{ id: 1, name: 'Paid', balance: 0, apr: 15, minPayment: 100 }],
      0, 'avalanche',
    );
    expect(r.monthsToPayoff).toBe(0);
    expect(r.debtFreeDate).toBe('Debt-Free!');
  });

  test('Timeline total balance decreases over time', () => {
    const r = simulatePayoff(sampleDebts, 200, 'avalanche');
    for (let i = 1; i < r.timeline.length; i++) {
      expect(r.timeline[i].totalBalance).toBeLessThanOrEqual(r.timeline[i - 1].totalBalance);
    }
  });

  test('Final timeline entry has zero total balance', () => {
    const r = simulatePayoff(sampleDebts, 200, 'avalanche');
    const last = r.timeline[r.timeline.length - 1];
    expect(last.totalBalance).toBe(0);
  });
});
