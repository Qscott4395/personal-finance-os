// ─── Types ────────────────────────────────────────────────────────────────────

export interface WithdrawalYearData {
  age: number;
  startBalance: number;
  withdrawal: number;
  endBalance: number;
}

export interface WithdrawalResult {
  annualWithdrawal: number;
  monthlyWithdrawal: number;
  portfolioLongevityYears: number; // Infinity if portfolio never depletes
  depletsAtAge: number | null;     // null if never depletes
  yearByYear: WithdrawalYearData[];
}

export interface WithdrawalComparison {
  rate: number;
  annual: number;
  monthly: number;
  yearsLasting: number;
  depletsAtAge: number | null;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const MAX_RETIREMENT_AGE = 120;

export function calculateWithdrawal(
  portfolioValue: number,
  withdrawalRate: number,       // percentage, e.g. 4
  retirementReturnRate: number, // percentage during retirement, e.g. 5
  inflationRate: number,        // percentage, e.g. 3
  retirementAge: number,
  annualLivingExpenses?: number, // floor — can't withdraw less than you need to live
): WithdrawalResult {
  const rate = withdrawalRate / 100;
  const retReturn = retirementReturnRate / 100;
  const inflation = inflationRate / 100;

  let balance = portfolioValue;
  let annualWithdrawal = Math.max(portfolioValue * rate, annualLivingExpenses ?? 0);
  const firstYearWithdrawal = annualWithdrawal;
  const yearByYear: WithdrawalYearData[] = [];
  let depleted = false;

  for (let year = 0; year < MAX_RETIREMENT_AGE - retirementAge; year++) {
    const age = retirementAge + year;
    const startBalance = balance;

    if (balance <= 0) {
      depleted = true;
      break;
    }

    // Withdraw first, then grow remaining
    const actualWithdrawal = Math.min(annualWithdrawal, balance);
    balance -= actualWithdrawal;
    balance *= (1 + retReturn);

    yearByYear.push({
      age,
      startBalance: Math.round(startBalance),
      withdrawal: Math.round(actualWithdrawal),
      endBalance: Math.round(Math.max(0, balance)),
    });

    if (balance <= 0) {
      depleted = true;
      break;
    }

    // Increase withdrawal for inflation next year
    annualWithdrawal *= (1 + inflation);
  }

  const longevity = depleted ? yearByYear.length : Infinity;
  const depletsAtAge = depleted ? retirementAge + yearByYear.length : null;

  return {
    annualWithdrawal: Math.round(firstYearWithdrawal),
    monthlyWithdrawal: Math.round(firstYearWithdrawal / 12),
    portfolioLongevityYears: longevity,
    depletsAtAge,
    yearByYear,
  };
}

export function buildComparisonTable(
  portfolioValue: number,
  retirementReturnRate: number,
  inflationRate: number,
  retirementAge: number,
  rates: number[] = [3, 3.5, 4, 4.5, 5],
  annualLivingExpenses?: number,
): WithdrawalComparison[] {
  return rates.map(rate => {
    const result = calculateWithdrawal(
      portfolioValue, rate, retirementReturnRate, inflationRate, retirementAge, annualLivingExpenses,
    );
    return {
      rate,
      annual: result.annualWithdrawal,
      monthly: result.monthlyWithdrawal,
      yearsLasting: result.portfolioLongevityYears,
      depletsAtAge: result.depletsAtAge,
    };
  });
}
