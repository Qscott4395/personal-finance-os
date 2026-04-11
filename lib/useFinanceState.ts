'use client';

import { useState, useMemo } from 'react';
import { calculateTax, type State } from '@/lib/tax';
import { calculateProjection } from '@/lib/projection';
import { buildPaycheckTimeline } from '@/lib/paycheck-timeline';
import {
  getCurrentAllocation, getTargetAllocation, calculateDrift,
  projectAllocationByDecade, type RiskTolerance,
} from '@/lib/allocation';
import { calculateWithdrawal, buildComparisonTable } from '@/lib/withdrawal';
import { buildTrinityHeatMap, maxSafeWithdrawalRate, runMonteCarloSimulation } from '@/lib/survivability';
import { buildRetirementIncomeWaterfall, compareWorkingVsRetirementTax } from '@/lib/retirement-income';
import { simulatePayoff, compareStrategies, type DebtEntry, type DebtStrategy } from '@/lib/debt-strategy';
import { CHART_COLORS as C } from '@/lib/constants';

export interface SavingsGoal {
  id: number;
  name: string;
  target: number;
  current: number;
}

export function useFinanceState() {
  // ── Income ──────────────────────────────────────────────────────────────────
  const [salary,           setSalary]           = useState(100_000);
  const [state,            setState_]           = useState<State>('IL');
  const [contrib401k,      setContrib401k]      = useState(6);
  const [isRoth401k,       setIsRoth401k]       = useState(false);
  const [paySchedule,      setPaySchedule]      = useState<26 | 24>(26);
  const [employerMatchRate,setEmployerMatchRate] = useState(100);
  const [employerMatchCap, setEmployerMatchCap] = useState(4);
  const [monthlyMedical,   setMonthlyMedical]   = useState(200);
  const [firstPayDate,     setFirstPayDate]     = useState('2026-01-09');

  // ── Monthly Expense Overrides ────────────────────────────────────────────────
  // Key = month index (0-11), value = override amount (replaces baseline for that month)
  const [expenseOverrides, setExpenseOverrides] = useState<Record<number, number>>({});
  const [overrideLabels,   setOverrideLabels]   = useState<Record<number, string>>({});

  // ── Expenses — Housing ────────────────────────────────────────────────────────
  const [rent,          setRent]          = useState(1_500);
  const [homeInsurance, setHomeInsurance] = useState(100);
  const [homeMaint,     setHomeMaint]     = useState(200);
  const housing = rent + homeInsurance + homeMaint;

  // ── Expenses — Utilities ──────────────────────────────────────────────────────
  const [electric,  setElectric]  = useState(80);
  const [gasUtil,   setGasUtil]   = useState(60);
  const [internet,  setInternet]  = useState(60);
  const [phone,     setPhone]     = useState(50);
  const utilities = electric + gasUtil + internet + phone;

  // ── Expenses — Food ───────────────────────────────────────────────────────────
  const [groceries, setGroceries] = useState(400);
  const [dining,    setDining]    = useState(150);
  const [coffee,    setCoffee]    = useState(50);
  const food = groceries + dining + coffee;

  // ── Expenses — Transportation ─────────────────────────────────────────────────
  const [carPayment,    setCarPayment]    = useState(300);
  const [gasFuel,       setGasFuel]       = useState(80);
  const [autoInsurance, setAutoInsurance] = useState(120);
  const transportation = carPayment + gasFuel + autoInsurance;

  // ── Expenses — Debts ──────────────────────────────────────────────────────────
  const [studentLoans, setStudentLoans] = useState(300);
  const [creditCards,  setCreditCards]  = useState(150);
  const [otherDebts,   setOtherDebts]   = useState(50);
  const debts = studentLoans + creditCards + otherDebts;

  // ── Expenses — Misc ───────────────────────────────────────────────────────────
  const [entertainment,  setEntertainment]  = useState(100);
  const [clothing,       setClothing]       = useState(80);
  const [gym,            setGym]            = useState(50);
  const [subscriptions,  setSubscriptions]  = useState(70);
  const misc = entertainment + clothing + gym + subscriptions;

  // ── Investments & Projection ─────────────────────────────────────────────────
  const [rothAnnual,        setRothAnnual]        = useState(6_500);
  const [brokerageAnnual,   setBrokerageAnnual]   = useState(3_000);
  const [cashSavingsAnnual, setCashSavingsAnnual] = useState(2_400);
  const [balance401k,       setBalance401k]       = useState(15_000);
  const [balanceRoth,       setBalanceRoth]       = useState(5_000);
  const [balanceBrokerage,  setBalanceBrokerage]  = useState(5_000);
  const [balanceCash,       setBalanceCash]       = useState(10_000);
  const [currentAge,        setCurrentAge]        = useState(30);
  const [retirementAge,     setRetirementAge]     = useState(65);
  const [returnRate,        setReturnRate]        = useState(7);
  const [cashRate,          setCashRate]          = useState(4.5);
  const [salaryGrowth,      setSalaryGrowth]      = useState(3);
  const [inflationRate,     setInflationRate]     = useState(3);
  const [riskTolerance,    setRiskTolerance]    = useState<RiskTolerance>('moderate');
  const [withdrawalRate,   setWithdrawalRate]   = useState(4);
  const [retReturnRate,    setRetReturnRate]    = useState(5);
  const [targetConfidence, setTargetConfidence] = useState(95);
  const [planThroughAge,   setPlanThroughAge]   = useState(95);
  const retDuration = Math.max(5, planThroughAge - retirementAge);
  const [wantedRetIncome,  setWantedRetIncome]  = useState(60_000); // annual desired retirement income
  const [socialSecurityMo, setSocialSecurityMo] = useState(0);
  const [pensionMo,        setPensionMo]        = useState(0);
  const [showReal,          setShowReal]          = useState(false);
  const [showBands,         setShowBands]         = useState(true);

  // ── What-If Scenario ──────────────────────────────────────────────────────────
  const [scenarioType, setScenarioType] = useState<'none' | 'raise' | 'cut-expenses' | 'boost-401k' | 'custom'>('none');
  const [scenarioSalary,      setScenarioSalary]      = useState(salary);
  const [scenarioExpenses,    setScenarioExpenses]    = useState(0); // reduction amount
  const [scenario401k,        setScenario401k]        = useState(contrib401k);
  const [scenarioRothAnnual,  setScenarioRothAnnual]  = useState(rothAnnual);

  // ── Savings Goals ────────────────────────────────────────────────────────────
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([
    { id: 1, name: 'Emergency Fund', target: 15000, current: 5000 },
    { id: 2, name: 'Vacation', target: 3000, current: 800 },
  ]);
  const [nextGoalId, setNextGoalId] = useState(3);

  // ── Debt Strategy ──────────────────────────────────────────────────────────────
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([
    { id: 1, name: 'Student Loans', balance: 35_000, apr: 5.5, minPayment: 300 },
    { id: 2, name: 'Credit Cards',  balance: 8_000,  apr: 22.5, minPayment: 150 },
    { id: 3, name: 'Other Debts',   balance: 3_000,  apr: 8.0, minPayment: 50 },
  ]);
  const [nextDebtId,       setNextDebtId]       = useState(4);
  const [debtExtraPayment, setDebtExtraPayment] = useState(0);
  const [debtStrategy,     setDebtStrategy]     = useState<DebtStrategy>('avalanche');

  // ── Derived: Tax ─────────────────────────────────────────────────────────────
  const tax = useMemo(
    () => calculateTax(salary, state, contrib401k, monthlyMedical, isRoth401k),
    [salary, state, contrib401k, monthlyMedical, isRoth401k],
  );

  // ── Derived: Projections ─────────────────────────────────────────────────────
  const projInput = useMemo(() => ({
    salary,
    contribution401kPct: contrib401k,
    employerMatchRate,
    employerMatchCapPct: employerMatchCap,
    rothAnnual,
    brokerageAnnual,
    cashSavingsAnnual,
    currentAge,
    retirementAge,
    annualReturnPct: returnRate,
    cashReturnPct:   cashRate,
    salaryGrowthPct: salaryGrowth,
    balance401k,
    balanceRoth,
    balanceBrokerage,
    balanceCash,
  }), [
    salary, contrib401k, employerMatchRate, employerMatchCap,
    rothAnnual, brokerageAnnual, cashSavingsAnnual,
    currentAge, retirementAge, returnRate, cashRate, salaryGrowth,
    balance401k, balanceRoth, balanceBrokerage, balanceCash,
  ]);

  const projection  = useMemo(() => calculateProjection(projInput), [projInput]);
  const projHigher  = useMemo(
    () => calculateProjection({ ...projInput, annualReturnPct: returnRate + 1 }),
    [projInput, returnRate],
  );
  const projEarlier = useMemo(() => {
    const earlyAge = Math.max(currentAge + 1, retirementAge - 5);
    return calculateProjection({ ...projInput, retirementAge: earlyAge });
  }, [projInput, currentAge, retirementAge]);

  // ── Derived: Expenses & Savings ──────────────────────────────────────────────
  const monthlyRoth         = rothAnnual / 12;
  const monthlyBrokerage    = brokerageAnnual / 12;
  const monthlyCash         = cashSavingsAnnual / 12;
  const totalLivingExpenses = housing + utilities + food + transportation + debts + misc;
  const totalExpenses       = totalLivingExpenses + monthlyRoth + monthlyBrokerage + monthlyCash;
  const monthlySurplus      = tax.monthlyNetIncome - totalExpenses;
  const employerMatch       = salary * Math.min(contrib401k / 100, employerMatchCap / 100) * (employerMatchRate / 100);

  const cashSavingsRate = tax.monthlyNetIncome > 0
    ? Math.max(0, (monthlySurplus / tax.monthlyNetIncome) * 100)
    : 0;

  const annualTrueSavings =
    tax.contribution401k + employerMatch + rothAnnual + brokerageAnnual + cashSavingsAnnual;
  const trueSavingsRate = salary > 0 ? (annualTrueSavings / salary) * 100 : 0;

  // ── Derived: Asset Allocation ──────────────────────────────────────────────────
  const currentAllocation = useMemo(
    () => getCurrentAllocation(balance401k, balanceRoth, balanceBrokerage, balanceCash),
    [balance401k, balanceRoth, balanceBrokerage, balanceCash],
  );
  const targetAlloc = useMemo(
    () => getTargetAllocation(currentAge, riskTolerance),
    [currentAge, riskTolerance],
  );
  const drift = useMemo(
    () => calculateDrift(currentAllocation, targetAlloc),
    [currentAllocation, targetAlloc],
  );
  const decadeProjection = useMemo(
    () => projectAllocationByDecade(currentAge, retirementAge, riskTolerance),
    [currentAge, retirementAge, riskTolerance],
  );

  // ── Derived: Withdrawal Modeling ────────────────────────────────────────────────
  const withdrawalResult = useMemo(
    () => calculateWithdrawal(projection.finalValue, withdrawalRate, retReturnRate, inflationRate, retirementAge, wantedRetIncome),
    [projection.finalValue, withdrawalRate, retReturnRate, inflationRate, retirementAge, wantedRetIncome],
  );
  const comparisonTable = useMemo(
    () => buildComparisonTable(projection.finalValue, retReturnRate, inflationRate, retirementAge, undefined, wantedRetIncome),
    [projection.finalValue, retReturnRate, inflationRate, retirementAge, wantedRetIncome],
  );

  // ── Derived: Trinity Study & Monte Carlo ───────────────────────────────────────
  const trinityHeatMap = useMemo(
    () => buildTrinityHeatMap(retDuration),
    [retDuration],
  );
  const maxSafeRate = useMemo(
    () => maxSafeWithdrawalRate(targetAlloc.equity, retDuration, targetConfidence),
    [targetAlloc.equity, retDuration, targetConfidence],
  );
  const monteCarloResult = useMemo(
    () => runMonteCarloSimulation({
      portfolioValue: projection.finalValue,
      annualWithdrawal: Math.max(projection.finalValue * (withdrawalRate / 100), wantedRetIncome),
      equityPct: targetAlloc.equity,
      inflationRate: inflationRate / 100,
      years: retDuration,
    }),
    [projection.finalValue, withdrawalRate, targetAlloc.equity, inflationRate, retDuration, wantedRetIncome],
  );

  // ── Derived: Retirement Income Waterfall ────────────────────────────────────────
  const retirementWaterfall = useMemo(
    () => buildRetirementIncomeWaterfall({
      retirementAge,
      socialSecurityMonthly: socialSecurityMo,
      pensionMonthly: pensionMo,
      balance401k: projection.final401k,
      balanceRoth: projection.finalRoth,
      balanceBrokerage: projection.finalBrokerage,
      balanceCash: projection.finalCash,
      withdrawalRate,
      inflationRate,
      retirementReturnRate: retReturnRate,
      years: retDuration,
      annualLivingExpenses: wantedRetIncome,
    }),
    [retirementAge, socialSecurityMo, pensionMo, projection, withdrawalRate, inflationRate, retReturnRate, retDuration, wantedRetIncome],
  );
  // Desired-income-only waterfall: shows what happens if you withdraw exactly your desired income
  const desiredIncomeAtRetirement = Math.round(
    wantedRetIncome * Math.pow(1 + inflationRate / 100, Math.max(0, retirementAge - currentAge)),
  );
  const desiredIncomeWaterfall = useMemo(
    () => buildRetirementIncomeWaterfall({
      retirementAge,
      socialSecurityMonthly: socialSecurityMo,
      pensionMonthly: pensionMo,
      balance401k: projection.final401k,
      balanceRoth: projection.finalRoth,
      balanceBrokerage: projection.finalBrokerage,
      balanceCash: projection.finalCash,
      withdrawalRate: 0, // force desired income as the sole driver
      inflationRate,
      retirementReturnRate: retReturnRate,
      years: retDuration,
      annualLivingExpenses: desiredIncomeAtRetirement,
    }),
    [retirementAge, socialSecurityMo, pensionMo, projection, inflationRate, retReturnRate, retDuration, desiredIncomeAtRetirement],
  );

  const taxComparison = useMemo(
    () => compareWorkingVsRetirementTax(
      salary,
      retirementWaterfall[0]?.totalGross ?? 0,
    ),
    [salary, retirementWaterfall],
  );

  // ── Derived: Debt Strategy ──────────────────────────────────────────────────
  const debtPayoffResult = useMemo(
    () => simulatePayoff(debtEntries, debtExtraPayment, debtStrategy),
    [debtEntries, debtExtraPayment, debtStrategy],
  );
  const debtComparison = useMemo(
    () => compareStrategies(debtEntries, debtExtraPayment),
    [debtEntries, debtExtraPayment],
  );

  // ── Derived: Inflation-Adjusted Projection Data ───────────────────────────────
  const chartData = useMemo(() => {
    if (!showReal) return projection.data;
    const rate = inflationRate / 100;
    return projection.data.map((d, i) => {
      const deflator = Math.pow(1 + rate, i);
      return {
        ...d,
        value401k:         Math.round(d.value401k / deflator),
        valueRoth:         Math.round(d.valueRoth / deflator),
        valueBrokerage:    Math.round(d.valueBrokerage / deflator),
        cashValue:         Math.round(d.cashValue / deflator),
        totalValue:        Math.round(d.totalValue / deflator),
        totalOptimistic:   Math.round(d.totalOptimistic / deflator),
        totalConservative: Math.round(d.totalConservative / deflator),
      };
    });
  }, [projection.data, showReal, inflationRate]);

  // ── Derived: Paycheck Timeline ────────────────────────────────────────────────
  const timeline = useMemo(
    () => buildPaycheckTimeline(tax, paySchedule, firstPayDate),
    [tax, paySchedule, firstPayDate],
  );

  // ── Derived: What-If Scenario ──────────────────────────────────────────────────
  const scenarioResults = useMemo(() => {
    if (scenarioType === 'none') return null;

    const sSalary = scenarioType === 'raise' ? scenarioSalary : salary;
    const sContrib = scenarioType === 'boost-401k' ? scenario401k : contrib401k;
    const sRoth = scenarioType === 'custom' ? scenarioRothAnnual : rothAnnual;
    const expenseReduction = scenarioType === 'cut-expenses' ? scenarioExpenses : 0;

    const sTax = calculateTax(sSalary, state, sContrib, monthlyMedical, isRoth401k);
    const sEmployerMatch = sSalary * Math.min(sContrib / 100, employerMatchCap / 100) * (employerMatchRate / 100);
    const sTotalExpenses = totalExpenses - expenseReduction;
    const sSurplus = sTax.monthlyNetIncome - sTotalExpenses;
    const sAnnualSavings = sTax.contribution401k + sEmployerMatch + sRoth + brokerageAnnual + cashSavingsAnnual;
    const sSavingsRate = sSalary > 0 ? (sAnnualSavings / sSalary) * 100 : 0;

    const sProj = calculateProjection({
      ...projInput,
      salary: sSalary,
      contribution401kPct: sContrib,
      rothAnnual: sRoth,
    });

    return {
      tax: sTax,
      surplus: sSurplus,
      savingsRate: sSavingsRate,
      netWorth: sProj.finalValue,
      annualInvested: sProj.annualInvested,
    };
  }, [scenarioType, scenarioSalary, scenario401k, scenarioRothAnnual, scenarioExpenses,
      salary, state, contrib401k, monthlyMedical, isRoth401k, employerMatchCap, employerMatchRate,
      totalExpenses, rothAnnual, brokerageAnnual, cashSavingsAnnual, projInput]);

  // ── Chart Data ───────────────────────────────────────────────────────────────
  const incomeBarData = [
    { name: 'Federal',   value: Math.round(tax.federalTax        / paySchedule), fill: C.federal  },
    { name: 'State',     value: Math.round(tax.stateTax          / paySchedule), fill: C.state    },
    { name: 'FICA',      value: Math.round(tax.totalFICA         / paySchedule), fill: C.fica     },
    { name: '401(k)',    value: Math.round(tax.contribution401k  / paySchedule), fill: C.k401     },
    { name: 'Medical',   value: Math.round(tax.medicalInsurance  / paySchedule), fill: C.medical  },
    { name: 'Take-Home', value: Math.round(tax.netIncome         / paySchedule), fill: C.net      },
  ];

  return {
    // ── Income state ──
    salary, setSalary,
    state, setState_,
    contrib401k, setContrib401k,
    isRoth401k, setIsRoth401k,
    paySchedule, setPaySchedule,
    employerMatchRate, setEmployerMatchRate,
    employerMatchCap, setEmployerMatchCap,
    monthlyMedical, setMonthlyMedical,
    firstPayDate, setFirstPayDate,

    // ── Expense overrides ──
    expenseOverrides, setExpenseOverrides,
    overrideLabels, setOverrideLabels,

    // ── Expenses — Housing ──
    rent, setRent,
    homeInsurance, setHomeInsurance,
    homeMaint, setHomeMaint,
    housing,

    // ── Expenses — Utilities ──
    electric, setElectric,
    gasUtil, setGasUtil,
    internet, setInternet,
    phone, setPhone,
    utilities,

    // ── Expenses — Food ──
    groceries, setGroceries,
    dining, setDining,
    coffee, setCoffee,
    food,

    // ── Expenses — Transportation ──
    carPayment, setCarPayment,
    gasFuel, setGasFuel,
    autoInsurance, setAutoInsurance,
    transportation,

    // ── Expenses — Debts ──
    studentLoans, setStudentLoans,
    creditCards, setCreditCards,
    otherDebts, setOtherDebts,
    debts,

    // ── Expenses — Misc ──
    entertainment, setEntertainment,
    clothing, setClothing,
    gym, setGym,
    subscriptions, setSubscriptions,
    misc,

    // ── Investment & projection state ──
    rothAnnual, setRothAnnual,
    brokerageAnnual, setBrokerageAnnual,
    cashSavingsAnnual, setCashSavingsAnnual,
    balance401k, setBalance401k,
    balanceRoth, setBalanceRoth,
    balanceBrokerage, setBalanceBrokerage,
    balanceCash, setBalanceCash,
    currentAge, setCurrentAge,
    retirementAge, setRetirementAge,
    returnRate, setReturnRate,
    cashRate, setCashRate,
    salaryGrowth, setSalaryGrowth,
    inflationRate, setInflationRate,
    riskTolerance, setRiskTolerance,
    withdrawalRate, setWithdrawalRate,
    retReturnRate, setRetReturnRate,
    targetConfidence, setTargetConfidence,
    retDuration,
    planThroughAge, setPlanThroughAge,
    wantedRetIncome, setWantedRetIncome,
    socialSecurityMo, setSocialSecurityMo,
    pensionMo, setPensionMo,
    showReal, setShowReal,
    showBands, setShowBands,

    // ── What-If Scenario state ──
    scenarioType, setScenarioType,
    scenarioSalary, setScenarioSalary,
    scenarioExpenses, setScenarioExpenses,
    scenario401k, setScenario401k,
    scenarioRothAnnual, setScenarioRothAnnual,

    // ── Savings Goals state ──
    savingsGoals, setSavingsGoals,
    nextGoalId, setNextGoalId,

    // ── Debt Strategy state ──
    debtEntries, setDebtEntries,
    nextDebtId, setNextDebtId,
    debtExtraPayment, setDebtExtraPayment,
    debtStrategy, setDebtStrategy,

    // ── Derived values ──
    tax,
    projection,
    projHigher,
    projEarlier,
    monthlyRoth,
    monthlyBrokerage,
    monthlyCash,
    totalLivingExpenses,
    totalExpenses,
    monthlySurplus,
    employerMatch,
    cashSavingsRate,
    annualTrueSavings,
    trueSavingsRate,
    currentAllocation,
    targetAlloc,
    drift,
    decadeProjection,
    withdrawalResult,
    comparisonTable,
    trinityHeatMap,
    maxSafeRate,
    monteCarloResult,
    retirementWaterfall,
    desiredIncomeWaterfall,
    desiredIncomeAtRetirement,
    taxComparison,
    chartData,
    timeline,
    scenarioResults,
    incomeBarData,
    debtPayoffResult,
    debtComparison,
  };
}

export type FinanceState = ReturnType<typeof useFinanceState>;
