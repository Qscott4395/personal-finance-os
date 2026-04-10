// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectionInput {
  salary: number;
  contribution401kPct: number;
  employerMatchRate: number;
  employerMatchCapPct: number;
  rothAnnual: number;
  brokerageAnnual: number;
  cashSavingsAnnual: number;
  currentAge: number;
  retirementAge: number;
  annualReturnPct: number;
  cashReturnPct: number;
  salaryGrowthPct: number;
  balance401k: number;
  balanceRoth: number;
  balanceBrokerage: number;
  balanceCash: number;
}

export interface DataPoint {
  age: number;
  value401k: number;
  valueRoth: number;
  valueBrokerage: number;
  cashValue: number;
  totalValue: number;
}

export interface ProjectionResult {
  data: DataPoint[];
  finalValue: number;
  final401k: number;
  finalRoth: number;
  finalBrokerage: number;
  finalCash: number;
  annualInvested: number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const {
    salary,
    contribution401kPct,
    employerMatchRate,
    employerMatchCapPct,
    rothAnnual,
    brokerageAnnual,
    cashSavingsAnnual,
    currentAge,
    retirementAge,
    annualReturnPct,
    cashReturnPct,
    salaryGrowthPct,
    balance401k,
    balanceRoth,
    balanceBrokerage,
    balanceCash,
  } = input;

  const returnRate  = annualReturnPct / 100;
  const cashRate    = cashReturnPct   / 100;
  const growthRate  = salaryGrowthPct / 100;
  const contrib401k = contribution401kPct / 100;
  const matchRate   = employerMatchRate   / 100;
  const matchCap    = employerMatchCapPct / 100;

  let bal401k     = Math.max(0, balance401k);
  let balRoth     = Math.max(0, balanceRoth);
  let balBrokerage = Math.max(0, balanceBrokerage);
  let balCash     = Math.max(0, balanceCash);
  let salary_     = Math.max(0, salary);

  const data: DataPoint[] = [];
  let annualInvested = 0;

  const years = Math.max(0, retirementAge - currentAge);

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;

    const employee401k  = salary_ * contrib401k;
    const employerMatch = salary_ * Math.min(contrib401k, matchCap) * matchRate;

    if (i === 0) annualInvested = employee401k + employerMatch + rothAnnual + brokerageAnnual + cashSavingsAnnual;

    // Each bucket grows independently at the same return rate
    bal401k      = bal401k      * (1 + returnRate) + employee401k + employerMatch;
    balRoth      = balRoth      * (1 + returnRate) + rothAnnual;
    balBrokerage = balBrokerage * (1 + returnRate) + brokerageAnnual;
    balCash      = balCash      * (1 + cashRate)   + cashSavingsAnnual;

    salary_ *= 1 + growthRate;

    data.push({
      age,
      value401k:    Math.round(bal401k),
      valueRoth:    Math.round(balRoth),
      valueBrokerage: Math.round(balBrokerage),
      cashValue:    Math.round(balCash),
      totalValue:   Math.round(bal401k + balRoth + balBrokerage + balCash),
    });
  }

  const last = data[data.length - 1];

  return {
    data,
    finalValue:    last?.totalValue    ?? 0,
    final401k:     last?.value401k     ?? 0,
    finalRoth:     last?.valueRoth     ?? 0,
    finalBrokerage: last?.valueBrokerage ?? 0,
    finalCash:     last?.cashValue     ?? 0,
    annualInvested,
  };
}
