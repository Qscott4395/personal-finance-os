// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

export interface AllocationBreakdown {
  k401: number;
  roth: number;
  brokerage: number;
  cash: number;
  total: number;
  pctK401: number;
  pctRoth: number;
  pctBrokerage: number;
  pctCash: number;
}

export interface TargetAllocation {
  equity: number;   // 0-100
  bonds: number;    // 0-100
  cash: number;     // 0-100
}

export interface DriftItem {
  bucket: string;
  current: number;
  target: number;
  drift: number;    // absolute difference
}

export interface DriftResult {
  needsRebalancing: boolean;
  maxDrift: number;
  drifts: DriftItem[];
}

export interface DecadeAllocation {
  age: number;
  equity: number;
  bonds: number;
  cash: number;
}

// ─── Functions ────────────────────────────────────────────────────────────────

export function getCurrentAllocation(
  balance401k: number,
  balanceRoth: number,
  balanceBrokerage: number,
  balanceCash: number,
): AllocationBreakdown {
  const total = balance401k + balanceRoth + balanceBrokerage + balanceCash;
  if (total === 0) {
    return { k401: 0, roth: 0, brokerage: 0, cash: 0, total: 0,
      pctK401: 0, pctRoth: 0, pctBrokerage: 0, pctCash: 0 };
  }
  return {
    k401: balance401k,
    roth: balanceRoth,
    brokerage: balanceBrokerage,
    cash: balanceCash,
    total,
    pctK401: (balance401k / total) * 100,
    pctRoth: (balanceRoth / total) * 100,
    pctBrokerage: (balanceBrokerage / total) * 100,
    pctCash: (balanceCash / total) * 100,
  };
}

export function getTargetAllocation(age: number, risk: RiskTolerance): TargetAllocation {
  const base = risk === 'conservative' ? 100 : risk === 'aggressive' ? 120 : 110;
  const equity = Math.max(10, Math.min(95, base - age));
  const cash = 10; // always keep 10% in cash
  const bonds = Math.max(0, 100 - equity - cash);
  return { equity, bonds, cash };
}

export function calculateDrift(
  current: AllocationBreakdown,
  target: TargetAllocation,
): DriftResult {
  if (current.total === 0) {
    return { needsRebalancing: false, maxDrift: 0, drifts: [] };
  }

  // Map current buckets to asset classes:
  // 401k + Roth + Brokerage = equity (growth assets), Cash = cash
  const currentEquity = current.pctK401 + current.pctRoth + current.pctBrokerage;
  const currentCash = current.pctCash;
  const currentBonds = 0; // no bond bucket yet

  const drifts: DriftItem[] = [
    { bucket: 'Equity', current: currentEquity, target: target.equity, drift: Math.abs(currentEquity - target.equity) },
    { bucket: 'Bonds', current: currentBonds, target: target.bonds, drift: Math.abs(currentBonds - target.bonds) },
    { bucket: 'Cash', current: currentCash, target: target.cash, drift: Math.abs(currentCash - target.cash) },
  ];

  const maxDrift = Math.max(...drifts.map(d => d.drift));

  return {
    needsRebalancing: maxDrift > 5,
    maxDrift,
    drifts,
  };
}

export function projectAllocationByDecade(
  currentAge: number,
  retirementAge: number,
  risk: RiskTolerance,
): DecadeAllocation[] {
  const result: DecadeAllocation[] = [];
  // Start from current decade, go to retirement + 10 years
  const startDecade = Math.floor(currentAge / 10) * 10;
  const endAge = retirementAge + 10;

  for (let age = startDecade; age <= endAge; age += 10) {
    const alloc = getTargetAllocation(age, risk);
    result.push({ age, ...alloc });
  }

  return result;
}
