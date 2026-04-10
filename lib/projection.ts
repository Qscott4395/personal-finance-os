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
  totalNominal: number;       // always nominal (for inflation toggle)
  totalOptimistic: number;    // +2% return
  totalConservative: number;  // -2% return
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

  // Confidence band offsets
  const optimisticReturn  = returnRate + 0.02;
  const conservativeReturn = Math.max(0, returnRate - 0.02);

  let bal401k     = Math.max(0, balance401k);
  let balRoth     = Math.max(0, balanceRoth);
  let balBrokerage = Math.max(0, balanceBrokerage);
  let balCash     = Math.max(0, balanceCash);
  let salary_     = Math.max(0, salary);

  // Optimistic / conservative trackers (aggregate only)
  let totalOpt  = bal401k + balRoth + balBrokerage + balCash;
  let totalCons = totalOpt;

  const data: DataPoint[] = [];
  let annualInvested = 0;

  const years = Math.max(0, retirementAge - currentAge);

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;

    const employee401k  = salary_ * contrib401k;
    const employerMatch = salary_ * Math.min(contrib401k, matchCap) * matchRate;
    const totalContrib  = employee401k + employerMatch + rothAnnual + brokerageAnnual + cashSavingsAnnual;

    if (i === 0) annualInvested = totalContrib;

    // Each bucket grows independently at the same return rate
    bal401k      = bal401k      * (1 + returnRate) + employee401k + employerMatch;
    balRoth      = balRoth      * (1 + returnRate) + rothAnnual;
    balBrokerage = balBrokerage * (1 + returnRate) + brokerageAnnual;
    balCash      = balCash      * (1 + cashRate)   + cashSavingsAnnual;

    // Confidence bands
    totalOpt  = totalOpt  * (1 + optimisticReturn)   + totalContrib;
    totalCons = totalCons * (1 + conservativeReturn)  + totalContrib;

    salary_ *= 1 + growthRate;

    const nominalTotal = bal401k + balRoth + balBrokerage + balCash;

    data.push({
      age,
      value401k:        Math.round(bal401k),
      valueRoth:        Math.round(balRoth),
      valueBrokerage:   Math.round(balBrokerage),
      cashValue:        Math.round(balCash),
      totalValue:       Math.round(nominalTotal),
      totalNominal:     Math.round(nominalTotal),
      totalOptimistic:  Math.round(totalOpt),
      totalConservative: Math.round(totalCons),
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
