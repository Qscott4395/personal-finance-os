'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';

import { calculateTax, type State } from '@/lib/tax';
import { calculateProjection } from '@/lib/projection';
import { buildPaycheckTimeline } from '@/lib/paycheck-timeline';
import {
  getCurrentAllocation, getTargetAllocation, calculateDrift,
  projectAllocationByDecade, type RiskTolerance,
} from '@/lib/allocation';
import { RiskToggle, AllocationDonut, TargetDonut, RebalancingAlert, HeatMapGrid, MonteCarloHistogram, WaterfallChart } from '@/components/retirement-ui';
import { calculateWithdrawal, buildComparisonTable } from '@/lib/withdrawal';
import { buildTrinityHeatMap, maxSafeWithdrawalRate, runMonteCarloSimulation } from '@/lib/survivability';
import { buildRetirementIncomeWaterfall, compareWorkingVsRetirementTax } from '@/lib/retirement-income';
// import { buildMonthlySummary } from '@/lib/monthly-summary';
import { STATES, CHART_COLORS as C } from '@/lib/constants';
import { fmt, fmtShort, fmtPct } from '@/lib/formatters';
import {
  SummaryCard, NumInput, Slider, Label,
  RowStat, Divider, ChartTooltip, BarTooltip, CollapsibleCategory,
} from '@/components/ui';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {

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
  const [retDuration,      setRetDuration]      = useState(30);
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
  interface SavingsGoal {
    id: number;
    name: string;
    target: number;
    current: number;
  }
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([
    { id: 1, name: 'Emergency Fund', target: 15000, current: 5000 },
    { id: 2, name: 'Vacation', target: 3000, current: 800 },
  ]);
  const [nextGoalId, setNextGoalId] = useState(3);

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
    () => calculateWithdrawal(projection.finalValue, withdrawalRate, retReturnRate, inflationRate, retirementAge),
    [projection.finalValue, withdrawalRate, retReturnRate, inflationRate, retirementAge],
  );
  const comparisonTable = useMemo(
    () => buildComparisonTable(projection.finalValue, retReturnRate, inflationRate, retirementAge),
    [projection.finalValue, retReturnRate, inflationRate, retirementAge],
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
      annualWithdrawal: projection.finalValue * (withdrawalRate / 100),
      equityPct: targetAlloc.equity,
      inflationRate: inflationRate / 100,
      years: retDuration,
    }),
    [projection.finalValue, withdrawalRate, targetAlloc.equity, inflationRate, retDuration],
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
    }),
    [retirementAge, socialSecurityMo, pensionMo, projection, withdrawalRate, inflationRate, retReturnRate, retDuration],
  );
  const taxComparison = useMemo(
    () => compareWorkingVsRetirementTax(
      salary,
      retirementWaterfall[0]?.totalGross ?? 0,
    ),
    [salary, retirementWaterfall],
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Personal Finance OS</h1>
            <p className="text-slate-400 text-sm mt-0.5">Real-time financial planning · 2024 tax brackets · Single filer</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Effective Tax Rate</p>
            <p className="text-3xl font-bold text-amber-400 tabular-nums">{fmtPct(tax.effectiveTaxRate)}</p>
            <p className="text-slate-500 text-xs">Marginal: {fmtPct(tax.marginalFederalRate * 100)} federal</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Monthly Take-Home"
            value={fmt(tax.monthlyNetIncome)}
            sub={`${fmt(tax.netIncome)} / year`}
            accent="text-emerald-400"
          />
          <SummaryCard
            title="Monthly Surplus"
            value={fmt(monthlySurplus)}
            sub={`True savings rate: ${fmtPct(trueSavingsRate)} of gross`}
            accent={monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <SummaryCard
            title="Annual Invested"
            value={fmt(projection.annualInvested)}
            sub="Employee + employer + Roth"
            accent="text-blue-400"
          />
          <SummaryCard
            title="Projected Net Worth"
            value={fmt(projection.finalValue)}
            sub={`At age ${retirementAge} · ${fmt(projection.finalCash)} in cash`}
            accent="text-purple-400"
          />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Income & Taxes */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Income &amp; Taxes</h2>

            <div className="grid grid-cols-2 gap-4">
              <NumInput label="Annual Salary" value={salary} onChange={setSalary} prefix="$" step={1000} />
              <div>
                <Label>State</Label>
                <select
                  value={state}
                  onChange={e => setState_(e.target.value as State)}
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm
                    focus:outline-none focus:border-emerald-400 transition-colors"
                >
                  {STATES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 401(k) type toggle */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">401(k) Type</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 text-xs font-medium">
                <button
                  onClick={() => setIsRoth401k(false)}
                  className={`px-3 py-1.5 transition-colors ${!isRoth401k ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                >
                  Traditional (Pre-tax)
                </button>
                <button
                  onClick={() => setIsRoth401k(true)}
                  className={`px-3 py-1.5 transition-colors ${isRoth401k ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                >
                  Roth (Post-tax)
                </button>
              </div>
            </div>

            <Slider
              label={`401(k) Employee Contribution${isRoth401k ? ' — Roth (post-tax)' : ' — Traditional (pre-tax)'}`}
              value={contrib401k} min={0} max={25} step={0.5}
              onChange={setContrib401k}
              display={`${contrib401k}%  ·  ${fmt(tax.contribution401k)}/yr`}
            />
            <Slider
              label="Employer Match Rate"
              value={employerMatchRate} min={0} max={100} step={10}
              onChange={setEmployerMatchRate}
              display={`${employerMatchRate}%`}
            />
            <Slider
              label="Employer Match Cap (% of salary)"
              value={employerMatchCap} min={0} max={10} step={0.5}
              onChange={setEmployerMatchCap}
              display={`${employerMatchCap}%  ·  ${fmt(employerMatch)}/yr`}
            />
            <NumInput
              label="Medical Insurance (Monthly Pre-tax)"
              value={monthlyMedical} onChange={setMonthlyMedical} prefix="$" step={25}
            />

            <Divider />

            {/* Annual Breakdown */}
            <div className="space-y-2.5">
              <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Annual Breakdown</p>
              <RowStat label="Gross Income" value={fmt(tax.grossIncome)} accent="text-white" />
              <RowStat
                label={isRoth401k ? '401(k) Post-tax (Roth)' : '401(k) Pre-tax (Traditional)'}
                value={`(${fmt(tax.contribution401k)})`}
                accent={isRoth401k ? 'text-emerald-400' : 'text-blue-400'}
              />
              <RowStat label="Medical Insurance"    value={`(${fmt(tax.medicalInsurance)})`} accent="text-blue-400" />
              <RowStat label="Federal Tax"          value={`(${fmt(tax.federalTax)})`}       accent="text-red-400" />
              <RowStat label="State Tax"            value={`(${fmt(tax.stateTax)})`}         accent="text-orange-400" />
              <RowStat label="FICA (SS + Medicare)" value={`(${fmt(tax.totalFICA)})`}        accent="text-yellow-400" />
              <Divider />
              <div className="flex justify-between pt-0.5">
                <span className="text-white font-semibold">Annual Net Income</span>
                <span className="text-emerald-400 font-bold text-base">{fmt(tax.netIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Effective tax rate</span>
                <span className="text-slate-300 text-xs">{fmtPct(tax.effectiveTaxRate)}</span>
              </div>
            </div>

            <Divider />

            {/* Per-Paycheck Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Per Paycheck Breakdown</p>
                <div className="flex rounded-lg overflow-hidden border border-slate-600 text-xs font-medium">
                  <button
                    onClick={() => setPaySchedule(26)}
                    className={`px-3 py-1 transition-colors ${paySchedule === 26 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    Biweekly (26×)
                  </button>
                  <button
                    onClick={() => setPaySchedule(24)}
                    className={`px-3 py-1 transition-colors ${paySchedule === 24 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    Semimonthly (24×)
                  </button>
                </div>
              </div>
              <RowStat label="Gross Pay"     value={fmt(tax.grossIncome       / paySchedule)} accent="text-white" />
              <RowStat
                label={isRoth401k ? '401(k) Roth (post-tax)' : '401(k) Traditional (pre-tax)'}
                value={`(${fmt(tax.contribution401k / paySchedule)})`}
                accent={isRoth401k ? 'text-emerald-400' : 'text-blue-400'}
              />
              <RowStat label="Medical Insurance" value={`(${fmt(tax.medicalInsurance / paySchedule)})`} accent="text-blue-400" />
              <RowStat label="Federal Tax"       value={`(${fmt(tax.federalTax       / paySchedule)})`} accent="text-red-400" />
              <RowStat label="State Tax"         value={`(${fmt(tax.stateTax         / paySchedule)})`} accent="text-orange-400" />
              <RowStat label="Social Security"   value={`(${fmt(tax.socialSecurity   / paySchedule)})`} accent="text-yellow-400" />
              <RowStat label="Medicare"          value={`(${fmt(tax.medicare         / paySchedule)})`} accent="text-yellow-400" />
              <Divider />
              <div className="flex justify-between pt-0.5">
                <span className="text-white font-semibold">Take-Home / Check</span>
                <span className="text-emerald-400 font-bold text-lg">{fmt(tax.netIncome / paySchedule)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">{paySchedule === 26 ? '26 checks/yr · every 2 weeks' : '24 checks/yr · twice a month'}</span>
                <span className="text-slate-500 text-xs">Marginal: {fmtPct(tax.marginalFederalRate * 100)}</span>
              </div>
            </div>

            <Divider />

            {/* Income Composition Bar Chart */}
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Monthly Income Composition</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={incomeBarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {incomeBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses & Investments */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Monthly Expenses</h2>

            {/* Pie chart + category breakdown side by side */}
            <div className="flex gap-4 items-center">
              <div className="shrink-0">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Housing',        value: housing },
                        { name: 'Utilities',      value: utilities },
                        { name: 'Food',           value: food },
                        { name: 'Transportation', value: transportation },
                        { name: 'Debts',          value: debts },
                        { name: 'Misc',           value: misc },
                      ]}
                      cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                      dataKey="value" stroke="none"
                    >
                      {['#34d399','#60a5fa','#f59e0b','#a78bfa','#f87171','#94a3b8'].map((color, i) => (
                        <PieCell key={i} fill={color} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  { label: 'Housing',        value: housing,        color: 'bg-emerald-400' },
                  { label: 'Utilities',      value: utilities,      color: 'bg-blue-400' },
                  { label: 'Food',           value: food,           color: 'bg-amber-400' },
                  { label: 'Transportation', value: transportation, color: 'bg-violet-400' },
                  { label: 'Debts',          value: debts,          color: 'bg-red-400' },
                  { label: 'Misc',           value: misc,           color: 'bg-slate-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                    <span className="text-slate-400 truncate">{row.label}</span>
                    <span className="text-white ml-auto">{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subcategory groups */}
            <div className="space-y-2">
              <CollapsibleCategory label="Housing" total={housing} color="bg-emerald-400/70">
                <NumInput label="Rent / Mortgage"   value={rent}          onChange={setRent}          prefix="$" step={50} />
                <NumInput label="Home Insurance"    value={homeInsurance} onChange={setHomeInsurance} prefix="$" step={10} />
                <NumInput label="Maintenance"       value={homeMaint}     onChange={setHomeMaint}     prefix="$" step={10} />
              </CollapsibleCategory>
              <CollapsibleCategory label="Utilities" total={utilities} color="bg-blue-400/70">
                <NumInput label="Electric"  value={electric} onChange={setElectric} prefix="$" step={10} />
                <NumInput label="Gas"       value={gasUtil}  onChange={setGasUtil}  prefix="$" step={10} />
                <NumInput label="Internet"  value={internet} onChange={setInternet} prefix="$" step={5} />
                <NumInput label="Phone"     value={phone}    onChange={setPhone}    prefix="$" step={5} />
              </CollapsibleCategory>
              <CollapsibleCategory label="Food" total={food} color="bg-amber-400/70">
                <NumInput label="Groceries"   value={groceries} onChange={setGroceries} prefix="$" step={25} />
                <NumInput label="Dining Out"  value={dining}    onChange={setDining}    prefix="$" step={25} />
                <NumInput label="Coffee & Bars" value={coffee}  onChange={setCoffee}    prefix="$" step={10} />
              </CollapsibleCategory>
              <CollapsibleCategory label="Transportation" total={transportation} color="bg-violet-400/70">
                <NumInput label="Car Payment"    value={carPayment}    onChange={setCarPayment}    prefix="$" step={25} />
                <NumInput label="Gas & Fuel"     value={gasFuel}       onChange={setGasFuel}       prefix="$" step={10} />
                <NumInput label="Auto Insurance" value={autoInsurance} onChange={setAutoInsurance} prefix="$" step={10} />
              </CollapsibleCategory>
              <CollapsibleCategory label="Debts" total={debts} color="bg-red-400/70">
                <NumInput label="Student Loans" value={studentLoans} onChange={setStudentLoans} prefix="$" step={25} />
                <NumInput label="Credit Cards"  value={creditCards}  onChange={setCreditCards}  prefix="$" step={25} />
                <NumInput label="Other Loans"   value={otherDebts}   onChange={setOtherDebts}   prefix="$" step={25} />
              </CollapsibleCategory>
              <CollapsibleCategory label="Miscellaneous" total={misc} color="bg-slate-400/70">
                <NumInput label="Entertainment"  value={entertainment} onChange={setEntertainment} prefix="$" step={10} />
                <NumInput label="Clothing"       value={clothing}      onChange={setClothing}      prefix="$" step={10} />
                <NumInput label="Health & Gym"   value={gym}           onChange={setGym}           prefix="$" step={10} />
                <NumInput label="Subscriptions"  value={subscriptions} onChange={setSubscriptions} prefix="$" step={5} />
              </CollapsibleCategory>
            </div>

            <Divider />

            <div className="space-y-2">
              <RowStat label="Living Expenses"                          value={fmt(totalLivingExpenses)} accent="text-white" />
              <RowStat label="Roth IRA (from Investment Settings)"      value={fmt(monthlyRoth)}         accent="text-blue-400" />
              <RowStat label="Brokerage (from Investment Settings)"     value={fmt(monthlyBrokerage)}    accent="text-blue-400" />
              <RowStat label="Cash Savings (from Investment Settings)"  value={fmt(monthlyCash)}         accent="text-slate-300" />
              <Divider />
              <RowStat label="Total Monthly Outflow" value={fmt(totalExpenses)} accent="text-white" />
              <RowStat
                label="Monthly Surplus"
                value={fmt(monthlySurplus)}
                accent={monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              <RowStat label="Cash Savings Rate (surplus / take-home)" value={fmtPct(cashSavingsRate)} accent="text-slate-300" />
              <RowStat label="True Savings Rate (all savings / gross)"  value={fmtPct(trueSavingsRate)} accent="text-emerald-400" />
            </div>

            <Divider />

            {/* Investment Settings */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Investment Settings</h3>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Current Balances</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <NumInput label="401(k)"       value={balance401k}      onChange={setBalance401k}      prefix="$" step={1000} />
                <NumInput label="Roth IRA"     value={balanceRoth}      onChange={setBalanceRoth}      prefix="$" step={1000} />
                <NumInput label="Brokerage"    value={balanceBrokerage} onChange={setBalanceBrokerage} prefix="$" step={1000} />
                <NumInput label="Cash Savings" value={balanceCash}      onChange={setBalanceCash}      prefix="$" step={500} />
              </div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mt-4">Annual Contributions</p>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <NumInput label="Roth IRA / Year"     value={rothAnnual}        onChange={setRothAnnual}        prefix="$" step={500} max={7000} />
                <NumInput label="Brokerage / Year"    value={brokerageAnnual}   onChange={setBrokerageAnnual}   prefix="$" step={500} />
                <NumInput label="Cash Savings / Year" value={cashSavingsAnnual} onChange={setCashSavingsAnnual} prefix="$" step={500} />
              </div>
            </div>

            {/* Investment Summary */}
            <div className="bg-slate-700/40 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-3">Total Annual Investing</p>
              <RowStat
                label={isRoth401k ? 'Roth 401(k) (post-tax)' : 'Employee 401(k) (pre-tax)'}
                value={fmt(tax.contribution401k)} accent="text-blue-400"
              />
              <RowStat label={`Employer Match (${employerMatchRate}% up to ${employerMatchCap}%)`} value={fmt(employerMatch)}     accent="text-blue-300" />
              <RowStat label="Roth IRA (post-tax)"                                                  value={fmt(rothAnnual)}        accent="text-blue-400" />
              <RowStat label="Brokerage (post-tax)"                                                 value={fmt(brokerageAnnual)}   accent="text-blue-400" />
              <RowStat label="Cash Savings"                                                         value={fmt(cashSavingsAnnual)} accent="text-slate-300" />
              <Divider />
              <RowStat label="Total Annual" value={fmt(projection.annualInvested)}      accent="text-white" />
              <RowStat label="Monthly"      value={fmt(projection.annualInvested / 12)} accent="text-slate-300" />
            </div>
          </div>
        </div>

        {/* Net Worth Projection */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Net Worth Projection</h2>
              <p className="text-slate-400 text-sm">Contributions + compound growth over time</p>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Total at {retirementAge}</p>
                <p className="text-2xl font-bold text-purple-400 tabular-nums">{fmt(projection.finalValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider">401(k)</p>
                <p className="text-2xl font-bold text-blue-400 tabular-nums">{fmt(projection.final401k)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Roth IRA</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(projection.finalRoth)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Brokerage</p>
                <p className="text-2xl font-bold text-amber-400 tabular-nums">{fmt(projection.finalBrokerage)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-wider">Cash</p>
                <p className="text-2xl font-bold text-slate-300 tabular-nums">{fmt(projection.finalCash)}</p>
              </div>
            </div>
          </div>

          {/* Projection Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Slider
              label="Current Age"
              value={currentAge} min={18} max={retirementAge - 1}
              onChange={v => setCurrentAge(v)}
              display={`${currentAge}`}
            />
            <Slider
              label="Retirement Age"
              value={retirementAge} min={currentAge + 1} max={80}
              onChange={v => setRetirementAge(v)}
              display={`${retirementAge}`}
            />
            <Slider
              label="Investment Return Rate"
              value={returnRate} min={1} max={15} step={0.5}
              onChange={setReturnRate}
              display={`${returnRate}%`}
            />
            <Slider
              label="Cash / HYSA Rate"
              value={cashRate} min={0} max={10} step={0.25}
              onChange={setCashRate}
              display={`${cashRate}%`}
            />
            <Slider
              label="Salary Growth Rate"
              value={salaryGrowth} min={0} max={10} step={0.5}
              onChange={setSalaryGrowth}
              display={`${salaryGrowth}%`}
            />
            <Slider
              label="Inflation Rate"
              value={inflationRate} min={0} max={10} step={0.5}
              onChange={setInflationRate}
              display={`${inflationRate}%`}
            />
          </div>

          {/* Chart toggles */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowReal(r => !r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showReal
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
              }`}
            >
              {showReal ? `Inflation-Adjusted (${inflationRate}%)` : 'Show Inflation-Adjusted'}
            </button>
            <button
              onClick={() => setShowBands(b => !b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showBands
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
              }`}
            >
              {showBands ? 'Confidence Range On' : 'Show Confidence Range'}
            </button>
          </div>

          {/* Net Worth Chart */}
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <defs>
                {[
                  { id: 'grad401k',      color: C.k401      },
                  { id: 'gradRoth',      color: C.roth      },
                  { id: 'gradBrokerage', color: C.brokerage },
                  { id: 'gradCash',      color: C.cash      },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                ))}
                <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="age" stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 11 }}
                label={{ value: 'Age', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                stroke="#334155"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={fmtShort}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
              />
              {showBands && (
                <>
                  <Area type="monotone" dataKey="totalOptimistic" stroke="#a78bfa" fill="url(#gradBand)" strokeWidth={1} strokeDasharray="4 3" name={`Optimistic (+2%)`} />
                  <Area type="monotone" dataKey="totalConservative" stroke="#64748b" fill="none" strokeWidth={1} strokeDasharray="4 3" name={`Conservative (-2%)`} />
                </>
              )}
              <Area type="monotone" dataKey="value401k"      stackId="1" stroke={C.k401}      fill="url(#grad401k)"      strokeWidth={1.5} name="401(k)" />
              <Area type="monotone" dataKey="valueRoth"      stackId="1" stroke={C.roth}      fill="url(#gradRoth)"      strokeWidth={1.5} name="Roth IRA" />
              <Area type="monotone" dataKey="valueBrokerage" stackId="1" stroke={C.brokerage} fill="url(#gradBrokerage)" strokeWidth={1.5} name="Brokerage" />
              <Area type="monotone" dataKey="cashValue"      stackId="1" stroke={C.cash}      fill="url(#gradCash)"      strokeWidth={1.5} strokeDasharray="4 2" name="Cash" />
            </AreaChart>
          </ResponsiveContainer>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-emerald-400 text-sm leading-relaxed">
                At <strong>{returnRate}% return</strong>, you will have{' '}
                <strong>{fmt(projection.finalValue)}</strong> at age {retirementAge}.
              </p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-blue-400 text-sm leading-relaxed">
                Increasing return to <strong>{returnRate + 1}%</strong> adds{' '}
                <strong>{fmt(projHigher.finalValue - projection.finalValue)}</strong> to your balance.
              </p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-amber-400 text-sm leading-relaxed">
                Retiring 5 years earlier (age <strong>{Math.max(currentAge + 1, retirementAge - 5)}</strong>) gives you{' '}
                <strong>{fmt(projEarlier.finalValue)}</strong>
                {' '}—{' '}
                <strong className="text-red-400">{fmt(projection.finalValue - projEarlier.finalValue)} less</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Retirement Planning: Asset Allocation ── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Asset Allocation</h2>
              <p className="text-slate-400 text-sm">Current portfolio vs. age-based target</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-xs">Risk Tolerance</span>
              <RiskToggle value={riskTolerance} onChange={setRiskTolerance} />
            </div>
          </div>

          {/* Donut charts side by side */}
          <div className="flex flex-wrap gap-8 justify-center">
            <div>
              <AllocationDonut
                label="Current"
                data={[
                  { name: '401(k)', value: currentAllocation.k401, color: '#60a5fa' },
                  { name: 'Roth IRA', value: currentAllocation.roth, color: '#34d399' },
                  { name: 'Brokerage', value: currentAllocation.brokerage, color: '#fbbf24' },
                  { name: 'Cash', value: currentAllocation.cash, color: '#94a3b8' },
                ]}
              />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-400">401(k)</span><span className="text-white">{fmtPct(currentAllocation.pctK401)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Roth IRA</span><span className="text-white">{fmtPct(currentAllocation.pctRoth)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Brokerage</span><span className="text-white">{fmtPct(currentAllocation.pctBrokerage)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Cash</span><span className="text-white">{fmtPct(currentAllocation.pctCash)}</span></div>
              </div>
            </div>
            <div>
              <TargetDonut label="Target" equity={targetAlloc.equity} bonds={targetAlloc.bonds} cash={targetAlloc.cash} />
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-3"><span className="text-blue-400">Equity</span><span className="text-white">{fmtPct(targetAlloc.equity)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-violet-400">Bonds</span><span className="text-white">{fmtPct(targetAlloc.bonds)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Cash</span><span className="text-white">{fmtPct(targetAlloc.cash)}</span></div>
              </div>
            </div>
          </div>

          {/* Rebalancing alert */}
          <RebalancingAlert drift={drift} />

          {/* Decade projection table */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2">Target Allocation by Age</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left py-2 px-3 font-medium">Age</th>
                    <th className="text-right py-2 px-3 font-medium">Equity</th>
                    <th className="text-right py-2 px-3 font-medium">Bonds</th>
                    <th className="text-right py-2 px-3 font-medium">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {decadeProjection.map(row => (
                    <tr key={row.age} className={`border-b border-slate-700/40 ${row.age === Math.floor(currentAge / 10) * 10 ? 'bg-purple-500/10' : ''}`}>
                      <td className="py-2 px-3 text-slate-300 font-medium">{row.age}</td>
                      <td className="py-2 px-3 text-right text-blue-400">{fmtPct(row.equity)}</td>
                      <td className="py-2 px-3 text-right text-violet-400">{fmtPct(row.bonds)}</td>
                      <td className="py-2 px-3 text-right text-slate-400">{fmtPct(row.cash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Retirement Planning: Portfolio Survivability ── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Portfolio Survivability</h2>
            <p className="text-slate-400 text-sm">Trinity Study data + Monte Carlo simulation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
            <Slider
              label="Retirement Duration"
              value={retDuration} min={15} max={40} step={5}
              onChange={setRetDuration}
              display={`${retDuration} years`}
            />
            <div>
              <Slider
                label="Target Confidence"
                value={targetConfidence} min={80} max={99} step={1}
                onChange={setTargetConfidence}
                display={`${targetConfidence}%`}
              />
              <p className="text-slate-600 text-[10px] mt-1.5 leading-snug">
                The % of historical 30-year periods where your portfolio survived. 95% means it lasted in 95 out of 100 historical scenarios.
              </p>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-slate-400 text-xs mb-1">Max Safe Withdrawal Rate</p>
              <p className="text-emerald-400 text-2xl font-bold">{maxSafeRate}%</p>
              <p className="text-slate-500 text-[10px]">for {targetConfidence}% confidence over {retDuration} years</p>
            </div>
          </div>

          {/* Trinity Study Heat Map */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">
              Historical Success Rates ({retDuration}-Year Horizon)
            </p>
            <HeatMapGrid
              data={trinityHeatMap}
              rates={[3, 3.5, 4, 4.5, 5, 5.5, 6]}
              allocations={[0, 25, 50, 75, 100]}
              currentRate={withdrawalRate}
              currentAlloc={targetAlloc.equity}
            />
            <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500/60" /> &gt;90%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-yellow-500/40" /> 70-90%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500/40" /> &lt;60%</span>
            </div>
          </div>

          <Divider />

          {/* Monte Carlo Simulation */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">
              Monte Carlo Simulation (10,000 Runs)
            </p>
            <MonteCarloHistogram result={monteCarloResult} loading={false} retirementAge={retirementAge} />
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className={`text-sm leading-relaxed ${
                monteCarloResult.successRate >= 90 ? 'text-emerald-400' : monteCarloResult.successRate >= 75 ? 'text-amber-400' : 'text-red-400'
              }`}>
                Your <strong>{withdrawalRate}%</strong> withdrawal rate has a <strong>{monteCarloResult.successRate}%</strong> simulated success rate.
              </p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-blue-400 text-sm leading-relaxed">
                Max safe rate for <strong>{targetConfidence}%</strong> confidence: <strong>{maxSafeRate}%</strong> ({fmt(projection.finalValue * maxSafeRate / 100)}/yr).
              </p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-purple-400 text-sm leading-relaxed">
                Median ending balance: <strong>{fmt(monteCarloResult.medianEndingBalance)}</strong>
                {monteCarloResult.medianEndingBalance > projection.finalValue && ' — your portfolio likely grows in retirement.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Retirement Planning: Income Waterfall ── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Retirement Income Waterfall</h2>
            <p className="text-slate-400 text-sm">Income sources and tax-efficient withdrawal order</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <NumInput label="Social Security (Monthly)" value={socialSecurityMo} onChange={setSocialSecurityMo} prefix="$" step={100} />
            <NumInput label="Pension (Monthly)" value={pensionMo} onChange={setPensionMo} prefix="$" step={100} />
          </div>

          {/* Starting portfolio summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div className="sm:col-span-1 bg-slate-700/60 rounded-lg p-3 border border-purple-500/30">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Total at Age {retirementAge}</p>
              <p className="text-purple-400 font-bold tabular-nums">{fmt(projection.finalValue)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">401(k)</p>
              <p className="text-blue-400 font-semibold tabular-nums">{fmt(projection.final401k)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Roth IRA</p>
              <p className="text-emerald-400 font-semibold tabular-nums">{fmt(projection.finalRoth)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Brokerage</p>
              <p className="text-amber-400 font-semibold tabular-nums">{fmt(projection.finalBrokerage)}</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Cash</p>
              <p className="text-slate-300 font-semibold tabular-nums">{fmt(projection.finalCash)}</p>
            </div>
          </div>

          {/* Waterfall chart */}
          <WaterfallChart data={retirementWaterfall} />

          {/* Withdrawal order explanation */}
          <div className="bg-slate-700/40 rounded-lg p-4 space-y-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Tax-Efficient Withdrawal Order</p>
            <div className="flex flex-wrap gap-2">
              {[
                { num: '1', label: 'Brokerage', note: 'Capital gains rate (15%)', color: 'text-amber-400' },
                { num: '2', label: '401(k)', note: 'Ordinary income rate', color: 'text-blue-400' },
                { num: '3', label: 'Cash', note: 'Buffer / emergency', color: 'text-slate-300' },
                { num: '4', label: 'Roth IRA', note: 'Tax-free — save for last', color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                  <span className="text-purple-400 font-bold text-sm">{item.num}</span>
                  <div>
                    <p className={`text-xs font-medium ${item.color}`}>{item.label}</p>
                    <p className="text-slate-500 text-[10px]">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Working Effective Rate</p>
              <p className="text-red-400 font-bold text-lg">{fmtPct(taxComparison.workingEffective)}</p>
              <p className="text-slate-500 text-xs">On {fmt(salary)} salary</p>
              <p className="text-slate-600 text-[10px] mt-1">% of your salary going to federal income tax while working</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Retirement Effective Rate</p>
              <p className="text-emerald-400 font-bold text-lg">{fmtPct(taxComparison.retirementEffective)}</p>
              <p className="text-slate-500 text-xs">On {fmt(retirementWaterfall[0]?.totalGross ?? 0)} income</p>
              <p className="text-slate-600 text-[10px] mt-1">% of your first-year retirement income going to federal tax (Roth + cash are tax-free)</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Tax Savings</p>
              <p className={`font-bold text-lg ${taxComparison.savings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {taxComparison.savings > 0 ? '-' : '+'}{fmtPct(Math.abs(taxComparison.savings))}
              </p>
              <p className="text-slate-500 text-xs">effective rate reduction</p>
              <p className="text-slate-600 text-[10px] mt-1">How much lower your tax rate is in retirement vs working years</p>
            </div>
          </div>
        </div>

        {/* ── Estate / Legacy Value ── */}
        {(() => {
          const lastYear = retirementWaterfall[retirementWaterfall.length - 1];
          if (!lastYear) return null;
          const deathAge = retirementAge + retDuration;
          const estateTotal = lastYear.remainingTotal;
          const rothEstate = lastYear.remainingRoth;
          const k401Estate = lastYear.remaining401k;
          const brokerageEstate = lastYear.remainingBrokerage;
          const cashEstate = lastYear.remainingCash;
          // Tax estimates for heirs
          const k401HeirTax = k401Estate * 0.22; // heirs pay ordinary income tax ~22%
          const brokerageStepUp = 0; // stepped-up basis = no cap gains at death
          const estateAfterTax = rothEstate + cashEstate + brokerageEstate + (k401Estate - k401HeirTax);
          return (
            <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white">Estate / Legacy Value</h2>
                <p className="text-slate-400 text-sm">Remaining portfolio at age {deathAge} · what you leave behind</p>
              </div>

              {/* Hero stat */}
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Portfolio at Age {deathAge}</p>
                  <p className={`text-3xl font-bold tabular-nums ${estateTotal > 0 ? 'text-purple-400' : 'text-red-400'}`}>
                    {estateTotal > 0 ? fmt(estateTotal) : 'Depleted'}
                  </p>
                  {estateTotal > 0 && (
                    <p className="text-slate-500 text-xs mt-1">~{fmt(estateAfterTax)} after estimated heir taxes</p>
                  )}
                </div>
                {estateTotal <= 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                    <p className="text-red-400 text-sm">Portfolio depletes before age {deathAge}. Consider reducing withdrawal rate or retiring later.</p>
                  </div>
                )}
              </div>

              {estateTotal > 0 && (
                <>
                  {/* Per-bucket breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: '401(k)', value: k401Estate, color: 'text-blue-400', note: 'Heirs pay income tax (~22%)' },
                      { label: 'Roth IRA', value: rothEstate, color: 'text-emerald-400', note: 'Tax-free to heirs' },
                      { label: 'Brokerage', value: brokerageEstate, color: 'text-amber-400', note: 'Stepped-up basis at death' },
                      { label: 'Cash', value: cashEstate, color: 'text-slate-300', note: 'No tax impact' },
                    ].map(b => (
                      <div key={b.label} className="bg-slate-700/40 rounded-lg p-3">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">{b.label}</p>
                        <p className={`font-bold tabular-nums ${b.color}`}>{fmt(b.value)}</p>
                        <p className="text-slate-600 text-[10px] mt-1">{b.note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Heir tax breakdown */}
                  <div className="bg-slate-700/40 rounded-lg p-4 space-y-3">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Heir Tax Breakdown</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700">
                            <th className="text-left py-1.5 pr-3 font-medium">Account</th>
                            <th className="text-right py-1.5 px-3 font-medium">Balance</th>
                            <th className="text-right py-1.5 px-3 font-medium">Tax Rate</th>
                            <th className="text-right py-1.5 px-3 font-medium">Tax Owed</th>
                            <th className="text-right py-1.5 pl-3 font-medium">Heir Receives</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-700/40">
                            <td className="py-2 pr-3">
                              <p className="text-blue-400 font-medium">401(k)</p>
                              <p className="text-slate-600 text-[10px]">Pre-tax contributions — heirs owe ordinary income tax on every dollar withdrawn</p>
                            </td>
                            <td className="py-2 px-3 text-right text-white tabular-nums">{fmt(k401Estate)}</td>
                            <td className="py-2 px-3 text-right text-red-400 tabular-nums">22%</td>
                            <td className="py-2 px-3 text-right text-red-400 tabular-nums">−{fmt(k401HeirTax)}</td>
                            <td className="py-2 pl-3 text-right text-white font-medium tabular-nums">{fmt(k401Estate - k401HeirTax)}</td>
                          </tr>
                          <tr className="border-b border-slate-700/40">
                            <td className="py-2 pr-3">
                              <p className="text-emerald-400 font-medium">Roth IRA</p>
                              <p className="text-slate-600 text-[10px]">Already taxed — heirs inherit tax-free; must withdraw within 10 years (SECURE Act)</p>
                            </td>
                            <td className="py-2 px-3 text-right text-white tabular-nums">{fmt(rothEstate)}</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">0%</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">$0</td>
                            <td className="py-2 pl-3 text-right text-white font-medium tabular-nums">{fmt(rothEstate)}</td>
                          </tr>
                          <tr className="border-b border-slate-700/40">
                            <td className="py-2 pr-3">
                              <p className="text-amber-400 font-medium">Brokerage</p>
                              <p className="text-slate-600 text-[10px]">Stepped-up cost basis at death — heirs owe no capital gains on appreciation during your lifetime</p>
                            </td>
                            <td className="py-2 px-3 text-right text-white tabular-nums">{fmt(brokerageEstate)}</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">0%</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">$0</td>
                            <td className="py-2 pl-3 text-right text-white font-medium tabular-nums">{fmt(brokerageEstate)}</td>
                          </tr>
                          <tr className="border-b border-slate-700/40">
                            <td className="py-2 pr-3">
                              <p className="text-slate-300 font-medium">Cash</p>
                              <p className="text-slate-600 text-[10px]">Already-taxed dollars — no additional tax for heirs</p>
                            </td>
                            <td className="py-2 px-3 text-right text-white tabular-nums">{fmt(cashEstate)}</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">0%</td>
                            <td className="py-2 px-3 text-right text-emerald-400 tabular-nums">$0</td>
                            <td className="py-2 pl-3 text-right text-white font-medium tabular-nums">{fmt(cashEstate)}</td>
                          </tr>
                          <tr className="bg-slate-800/60">
                            <td className="py-2 pr-3 font-semibold text-white">Total Estate</td>
                            <td className="py-2 px-3 text-right text-white font-semibold tabular-nums">{fmt(estateTotal)}</td>
                            <td className="py-2 px-3 text-right text-slate-400 tabular-nums">—</td>
                            <td className="py-2 px-3 text-right text-red-400 font-semibold tabular-nums">−{fmt(k401HeirTax)}</td>
                            <td className="py-2 pl-3 text-right text-purple-400 font-bold tabular-nums">{fmt(estateAfterTax)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-slate-600 text-[10px]">* 22% heir income tax is an estimate. Actual rate depends on heir's income bracket. Federal estate tax (~40%) only applies above $13.6M exemption (2024).</p>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ── Retirement Planning: Withdrawal Rate Modeling ── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Withdrawal Rate Modeling</h2>
            <p className="text-slate-400 text-sm">How long will your portfolio last in retirement?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            <Slider
              label="Withdrawal Rate"
              value={withdrawalRate} min={2} max={8} step={0.25}
              onChange={setWithdrawalRate}
              display={`${withdrawalRate}%`}
            />
            <Slider
              label="Retirement Return Rate"
              value={retReturnRate} min={1} max={10} step={0.5}
              onChange={setRetReturnRate}
              display={`${retReturnRate}%`}
            />
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Annual Withdrawal"
              value={fmt(withdrawalResult.annualWithdrawal)}
              sub={`${fmt(withdrawalResult.monthlyWithdrawal)} / month`}
              accent="text-blue-400"
            />
            <SummaryCard
              title="Portfolio at Retirement"
              value={fmt(projection.finalValue)}
              sub={`At age ${retirementAge}`}
              accent="text-purple-400"
            />
            <SummaryCard
              title="Portfolio Lasts"
              value={withdrawalResult.portfolioLongevityYears === Infinity ? 'Forever' : `${withdrawalResult.portfolioLongevityYears} years`}
              sub={withdrawalResult.depletsAtAge ? `Depletes at age ${withdrawalResult.depletsAtAge}` : 'Never depletes'}
              accent={withdrawalResult.portfolioLongevityYears === Infinity || withdrawalResult.portfolioLongevityYears > 35 ? 'text-emerald-400' : withdrawalResult.portfolioLongevityYears > 25 ? 'text-amber-400' : 'text-red-400'}
            />
            <SummaryCard
              title="Withdrawal Rate"
              value={`${withdrawalRate}%`}
              sub={withdrawalRate <= 4 ? 'Within safe range' : 'Above traditional 4% rule'}
              accent={withdrawalRate <= 4 ? 'text-emerald-400' : 'text-amber-400'}
            />
          </div>

          {/* Comparison table */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2">Withdrawal Rate Comparison</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left py-2 px-3 font-medium">Rate</th>
                    <th className="text-right py-2 px-3 font-medium">Annual</th>
                    <th className="text-right py-2 px-3 font-medium">Monthly</th>
                    <th className="text-right py-2 px-3 font-medium">Years Lasting</th>
                    <th className="text-right py-2 px-3 font-medium">Depletes At</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonTable.map(row => (
                    <tr
                      key={row.rate}
                      className={`border-b border-slate-700/40 ${
                        row.rate === withdrawalRate ? 'bg-purple-500/10' : 'hover:bg-slate-700/20'
                      }`}
                    >
                      <td className={`py-2 px-3 font-medium ${row.rate === withdrawalRate ? 'text-purple-400' : 'text-slate-300'}`}>
                        {row.rate}%
                        {row.rate === withdrawalRate && <span className="text-[10px] text-purple-500 ml-1">SELECTED</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-white tabular-nums">{fmt(row.annual)}</td>
                      <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{fmt(row.monthly)}</td>
                      <td className={`py-2 px-3 text-right font-medium tabular-nums ${
                        row.yearsLasting === Infinity ? 'text-emerald-400' : row.yearsLasting > 30 ? 'text-emerald-400' : row.yearsLasting > 20 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {row.yearsLasting === Infinity ? 'Forever' : `${row.yearsLasting} yrs`}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 tabular-nums">
                        {row.depletsAtAge ? `Age ${row.depletsAtAge}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-emerald-400 text-sm leading-relaxed">
                At <strong>{withdrawalRate}%</strong>, you can withdraw <strong>{fmt(withdrawalResult.monthlyWithdrawal)}/mo</strong> starting at age {retirementAge}.
              </p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className={`text-sm leading-relaxed ${withdrawalResult.portfolioLongevityYears === Infinity || withdrawalResult.portfolioLongevityYears > 35 ? 'text-blue-400' : 'text-amber-400'}`}>
                {withdrawalResult.portfolioLongevityYears === Infinity
                  ? 'Your portfolio grows faster than withdrawals — it never runs out.'
                  : `Your portfolio lasts until age ${withdrawalResult.depletsAtAge}. ${
                      (withdrawalResult.depletsAtAge ?? 0) < 90 ? 'Consider reducing your withdrawal rate.' : ''
                    }`}
              </p>
            </div>
          </div>
        </div>

        {/* Paycheck Timeline */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Paycheck Timeline</h2>
              <p className="text-slate-400 text-sm">
                {paySchedule === 26 ? 'Biweekly (26 checks/yr)' : 'Semimonthly (24 checks/yr)'} · 2025 tax year
              </p>
            </div>
            <div className="flex flex-wrap gap-6 items-end text-right">
              <div className="text-left">
                <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">First Paycheck</label>
                <input
                  type="date"
                  value={firstPayDate}
                  onChange={e => setFirstPayDate(e.target.value)}
                  className="bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-3 text-white text-sm
                    focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Current Check</p>
                <p className="text-xl font-bold text-emerald-400">#{timeline.currentCheckNumber} <span className="text-slate-500 text-sm font-normal">of {timeline.totalChecks}</span></p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Checks Remaining</p>
                <p className="text-xl font-bold text-blue-400">{timeline.remainingChecks}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Jan</span>
              <span>Dec</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-emerald-400/80 rounded-full transition-all duration-500"
                style={{ width: `${(timeline.currentCheckNumber / timeline.totalChecks) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-emerald-400">{fmtPct((timeline.currentCheckNumber / timeline.totalChecks) * 100)} complete</span>
              <span className="text-slate-500">{fmtPct((timeline.remainingChecks / timeline.totalChecks) * 100)} remaining</span>
            </div>
          </div>

          {/* YTD / Remaining summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">YTD Gross Earned</p>
              <p className="text-white text-lg font-bold">{fmt(timeline.ytdGross)}</p>
              <p className="text-slate-500 text-xs mt-0.5">of {fmt(tax.grossIncome)} annual</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">YTD Taxes Paid</p>
              <p className="text-red-400 text-lg font-bold">{fmt(timeline.ytdTaxes)}</p>
              <p className="text-slate-500 text-xs mt-0.5">Fed + State + FICA</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">YTD Net Received</p>
              <p className="text-emerald-400 text-lg font-bold">{fmt(timeline.ytdNet)}</p>
              <p className="text-slate-500 text-xs mt-0.5">{fmt(timeline.remainingNet)} remaining</p>
            </div>
          </div>

          {/* Per-check detail */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2">Per Check</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <RowStat label="Gross Pay" value={fmt(tax.grossIncome / paySchedule)} accent="text-white" />
              <RowStat label="Federal Tax" value={`(${fmt(tax.federalTax / paySchedule)})`} accent="text-red-400" />
              <RowStat label="State Tax" value={`(${fmt(tax.stateTax / paySchedule)})`} accent="text-orange-400" />
              <RowStat label="FICA" value={`(${fmt(tax.totalFICA / paySchedule)})`} accent="text-yellow-400" />
              <RowStat label="401(k)" value={`(${fmt(tax.contribution401k / paySchedule)})`} accent="text-blue-400" />
              <RowStat label="Medical" value={`(${fmt(tax.medicalInsurance / paySchedule)})`} accent="text-blue-400" />
            </div>
            <Divider />
            <div className="flex justify-between pt-2">
              <span className="text-white font-semibold">Net Per Check</span>
              <span className="text-emerald-400 font-bold text-lg">{fmt(tax.netIncome / paySchedule)}</span>
            </div>
          </div>

          {/* Paycheck grid */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">All Paychecks</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-13 gap-1.5">
              {timeline.paychecks.map((pc) => (
                <div
                  key={pc.number}
                  className={`rounded-lg p-2 text-center text-xs transition-colors ${
                    pc.number <= timeline.currentCheckNumber
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-slate-700/40 border border-slate-700'
                  } ${pc.number === timeline.currentCheckNumber ? 'ring-1 ring-emerald-400' : ''}`}
                >
                  <p className={`font-bold ${pc.number <= timeline.currentCheckNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    #{pc.number}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{pc.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Expense Outlook */}
        {(() => {
          const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const now = new Date();
          const currentMonth = now.getMonth();
          let ytdBudgeted = 0;
          let ytdActual = 0;
          let annualTotal = 0;
          const rows = MONTHS.map((m, i) => {
            const baseline = totalExpenses;
            const override = expenseOverrides[i];
            const actual = override !== undefined ? override : baseline;
            const diff = actual - baseline;
            const label = overrideLabels[i] || '';
            annualTotal += actual;
            if (i <= currentMonth) {
              ytdBudgeted += baseline;
              ytdActual += actual;
            }
            return { month: m, index: i, baseline, actual, diff, label, isCurrent: i === currentMonth, hasOverride: override !== undefined };
          });

          return (
            <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Monthly Expense Outlook</h2>
                  <p className="text-slate-400 text-sm">Baseline: {fmt(totalExpenses)}/mo · Override months with irregular costs</p>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Annual Projected</p>
                    <p className="text-white font-bold">{fmt(annualTotal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">YTD Variance</p>
                    <p className={`font-bold ${ytdActual - ytdBudgeted > 0 ? 'text-red-400' : ytdActual - ytdBudgeted < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {ytdActual - ytdBudgeted > 0 ? '+' : ''}{fmt(ytdActual - ytdBudgeted)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {rows.map((row) => (
                  <div
                    key={row.index}
                    className={`rounded-lg p-3 border transition-colors ${
                      row.isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : row.hasOverride
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-700/40 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${row.isCurrent ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {row.month}
                        {row.isCurrent && <span className="text-[10px] text-emerald-500 ml-1">NOW</span>}
                      </span>
                      {row.hasOverride && row.diff !== 0 && (
                        <span className={`text-[10px] font-medium ${row.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {row.diff > 0 ? '+' : ''}{fmt(row.diff)}
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      value={row.hasOverride ? row.actual : ''}
                      placeholder={fmt(row.baseline)}
                      min={0}
                      step={50}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setExpenseOverrides(o => { const n = { ...o }; delete n[row.index]; return n; });
                        } else {
                          setExpenseOverrides(o => ({ ...o, [row.index]: Number(val) }));
                        }
                      }}
                      className={`w-full bg-slate-700/60 border rounded-lg py-1.5 px-2 text-sm
                        focus:outline-none focus:border-emerald-400 transition-colors
                        ${row.hasOverride ? 'border-amber-500/40 text-amber-400' : 'border-slate-600 text-white'}`}
                    />

                    <input
                      type="text"
                      value={row.label}
                      placeholder="Note..."
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setOverrideLabels(o => { const n = { ...o }; delete n[row.index]; return n; });
                        } else {
                          setOverrideLabels(o => ({ ...o, [row.index]: val }));
                        }
                      }}
                      className="w-full bg-transparent border-b border-transparent text-slate-500 text-[10px] mt-1.5
                        hover:border-slate-600 focus:border-emerald-400 focus:outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700 border border-slate-600" /> Baseline</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/30 border border-amber-500/40" /> Override</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/30 border border-emerald-500/40" /> Current</span>
              </div>
            </div>
          );
        })()}

        {/* Tax Withholding Tracker */}
        {(() => {
          const pctThrough = timeline.totalChecks > 0 ? timeline.currentCheckNumber / timeline.totalChecks : 0;
          const annualFederal = tax.federalTax;
          const annualState = tax.stateTax;
          const annualFICA = tax.totalFICA;
          const annualTotalTax = annualFederal + annualState + annualFICA;

          const ytdFederal = annualFederal * pctThrough;
          const ytdState = annualState * pctThrough;
          const ytdFICA = annualFICA * pctThrough;
          const ytdTotal = ytdFederal + ytdState + ytdFICA;

          const proRatedTarget = annualTotalTax * pctThrough;
          const diff = ytdTotal - proRatedTarget; // positive = over-withheld
          const yearEndDiff = annualTotalTax - annualTotalTax; // withholding = liability (no W-4 adjustment yet)

          // Status based on pace: withheld vs where you should be
          const federalPace = annualFederal > 0 ? (ytdFederal / (annualFederal * pctThrough || 1)) * 100 : 100;
          const statePace = annualState > 0 ? (ytdState / (annualState * pctThrough || 1)) * 100 : 100;

          const projectedRefund = ytdTotal / (pctThrough || 1) - annualTotalTax;
          const refundStatus = projectedRefund > 50 ? 'over' : projectedRefund < -50 ? 'under' : 'on-track';

          return (
            <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Tax Withholding Tracker</h2>
                  <p className="text-slate-400 text-sm">Are you on pace for your annual tax liability?</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  refundStatus === 'over'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : refundStatus === 'under'
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {refundStatus === 'over' ? 'Over-withheld' : refundStatus === 'under' ? 'Under-withheld' : 'On Track'}
                </div>
              </div>

              {/* Federal progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Federal Tax</span>
                  <span className="text-slate-400">{fmt(ytdFederal)} of {fmt(annualFederal)}</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
                  {/* Target marker */}
                  <div className="absolute h-full w-0.5 bg-slate-400/50 z-10" style={{ left: `${pctThrough * 100}%` }} />
                  <div
                    className="h-full bg-red-400/70 rounded-full transition-all duration-500"
                    style={{ width: `${annualFederal > 0 ? (ytdFederal / annualFederal) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-0.5">Target pace: {fmt(annualFederal * pctThrough)} by now</p>
              </div>

              {/* State progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">State Tax</span>
                  <span className="text-slate-400">{fmt(ytdState)} of {fmt(annualState)}</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
                  <div className="absolute h-full w-0.5 bg-slate-400/50 z-10" style={{ left: `${pctThrough * 100}%` }} />
                  <div
                    className="h-full bg-orange-400/70 rounded-full transition-all duration-500"
                    style={{ width: `${annualState > 0 ? (ytdState / annualState) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-0.5">Target pace: {fmt(annualState * pctThrough)} by now</p>
              </div>

              {/* FICA progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">FICA (SS + Medicare)</span>
                  <span className="text-slate-400">{fmt(ytdFICA)} of {fmt(annualFICA)}</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
                  <div className="absolute h-full w-0.5 bg-slate-400/50 z-10" style={{ left: `${pctThrough * 100}%` }} />
                  <div
                    className="h-full bg-yellow-400/70 rounded-full transition-all duration-500"
                    style={{ width: `${annualFICA > 0 ? (ytdFICA / annualFICA) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-0.5">Target pace: {fmt(annualFICA * pctThrough)} by now</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">YTD Withheld</p>
                  <p className="text-red-400 font-bold text-lg">{fmt(ytdTotal)}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Annual Liability</p>
                  <p className="text-white font-bold text-lg">{fmt(annualTotalTax)}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Remaining</p>
                  <p className="text-slate-300 font-bold text-lg">{fmt(annualTotalTax - ytdTotal)}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Projected Year-End</p>
                  <p className={`font-bold text-lg ${projectedRefund >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {projectedRefund >= 0 ? `+${fmt(projectedRefund)} refund` : `${fmt(Math.abs(projectedRefund))} owed`}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Savings Goals */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Savings Goals</h2>
              <p className="text-slate-400 text-sm">
                Funded from Cash Savings · <span className="text-emerald-400 font-medium">{fmt(monthlyCash)}/mo</span> split across goals
              </p>
            </div>
            <button
              onClick={() => {
                setSavingsGoals(g => [...g, { id: nextGoalId, name: 'New Goal', target: 5000, current: 0 }]);
                setNextGoalId(n => n + 1);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              + Add Goal
            </button>
          </div>

          {savingsGoals.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">No goals yet. Click &quot;+ Add Goal&quot; to get started.</p>
          )}

          <div className="space-y-4">
            {(() => {
              // Split monthlyCash evenly across incomplete goals
              const incompleteGoals = savingsGoals.filter(g => g.current < g.target);
              const perGoalMonthly = incompleteGoals.length > 0 ? monthlyCash / incompleteGoals.length : 0;

              return savingsGoals.map((goal) => {
                const isComplete = goal.current >= goal.target;
                const goalMonthly = isComplete ? 0 : perGoalMonthly;
                const remaining = Math.max(0, goal.target - goal.current);
                const monthsToGoal = goalMonthly > 0 ? Math.ceil(remaining / goalMonthly) : Infinity;
                const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
                const projectedDate = monthsToGoal < Infinity
                  ? new Date(Date.now() + monthsToGoal * 30.44 * 86400000)
                  : null;

                return (
                  <div key={goal.id} className="bg-slate-700/40 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={goal.name}
                        onChange={e => setSavingsGoals(gs => gs.map(g => g.id === goal.id ? { ...g, name: e.target.value } : g))}
                        className="bg-transparent text-white font-semibold text-sm border-b border-transparent hover:border-slate-600 focus:border-emerald-400 focus:outline-none transition-colors flex-1"
                      />
                      <span className="text-slate-400 text-xs">{fmt(goalMonthly)}/mo</span>
                      <button
                        onClick={() => setSavingsGoals(gs => gs.filter(g => g.id !== goal.id))}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{fmt(goal.current)} saved</span>
                        <span className="text-slate-400">{fmt(goal.target)} goal</span>
                      </div>
                      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100 ? 'bg-emerald-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className={pct >= 100 ? 'text-emerald-400 font-medium' : 'text-blue-400'}>{fmtPct(pct)}</span>
                        <span className="text-slate-500">
                          {pct >= 100
                            ? 'Goal reached!'
                            : projectedDate
                              ? `~${monthsToGoal} mo · ${projectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                              : 'No cash savings allocated'}
                        </span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-500 text-[10px] uppercase tracking-wider">Target</label>
                        <input
                          type="number"
                          value={goal.target}
                          min={0}
                          step={500}
                          onChange={e => setSavingsGoals(gs => gs.map(g => g.id === goal.id ? { ...g, target: Number(e.target.value) } : g))}
                          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 text-[10px] uppercase tracking-wider">Saved So Far</label>
                        <input
                          type="number"
                          value={goal.current}
                          min={0}
                          step={100}
                          onChange={e => setSavingsGoals(gs => gs.map(g => g.id === goal.id ? { ...g, current: Number(e.target.value) } : g))}
                          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Summary */}
          {savingsGoals.length > 0 && (
            <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-700/60">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Total Goal Amount</p>
                <p className="text-white font-bold">{fmt(savingsGoals.reduce((s, g) => s + g.target, 0))}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Total Saved</p>
                <p className="text-emerald-400 font-bold">{fmt(savingsGoals.reduce((s, g) => s + g.current, 0))}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Cash Savings Pool</p>
                <p className="text-blue-400 font-bold">{fmt(monthlyCash)}/mo</p>
              </div>
            </div>
          )}
        </div>

        {/* What-If Scenarios */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white">What-If Scenarios</h2>
            <p className="text-slate-400 text-sm">Model changes and see the impact side-by-side</p>
          </div>

          {/* Scenario selector */}
          <div className="flex flex-wrap gap-2">
            {([
              ['none', 'Off'],
              ['raise', 'Salary Raise'],
              ['cut-expenses', 'Cut Expenses'],
              ['boost-401k', 'Boost 401(k)'],
              ['custom', 'Custom'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setScenarioType(key);
                  if (key === 'raise') setScenarioSalary(Math.round(salary * 1.1));
                  if (key === 'boost-401k') setScenario401k(Math.min(25, contrib401k + 3));
                  if (key === 'cut-expenses') setScenarioExpenses(300);
                  if (key === 'custom') { setScenarioSalary(salary); setScenarioRothAnnual(rothAnnual); }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  scenarioType === key
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scenario inputs */}
          {scenarioType === 'raise' && (
            <div className="max-w-xs">
              <NumInput label="New Annual Salary" value={scenarioSalary} onChange={setScenarioSalary} prefix="$" step={5000} />
            </div>
          )}
          {scenarioType === 'cut-expenses' && (
            <div className="max-w-xs">
              <NumInput label="Monthly Expense Reduction" value={scenarioExpenses} onChange={setScenarioExpenses} prefix="$" step={50} />
            </div>
          )}
          {scenarioType === 'boost-401k' && (
            <div className="max-w-xs">
              <Slider label="New 401(k) %" value={scenario401k} min={0} max={25} step={0.5} onChange={setScenario401k} display={`${scenario401k}%`} />
            </div>
          )}
          {scenarioType === 'custom' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
              <NumInput label="Salary" value={scenarioSalary} onChange={setScenarioSalary} prefix="$" step={5000} />
              <NumInput label="Roth IRA / Year" value={scenarioRothAnnual} onChange={setScenarioRothAnnual} prefix="$" step={500} />
              <NumInput label="Expense Cut / Mo" value={scenarioExpenses} onChange={setScenarioExpenses} prefix="$" step={50} />
            </div>
          )}

          {/* Comparison */}
          {scenarioResults && scenarioType !== 'none' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Monthly Surplus',
                  current: monthlySurplus,
                  scenario: scenarioResults.surplus,
                },
                {
                  label: 'Savings Rate',
                  current: trueSavingsRate,
                  scenario: scenarioResults.savingsRate,
                  isPct: true,
                },
                {
                  label: 'Annual Invested',
                  current: projection.annualInvested,
                  scenario: scenarioResults.annualInvested,
                },
                {
                  label: `Net Worth at ${retirementAge}`,
                  current: projection.finalValue,
                  scenario: scenarioResults.netWorth,
                },
              ].map(({ label, current, scenario, isPct }) => {
                const delta = scenario - current;
                return (
                  <div key={label} className="bg-slate-700/40 rounded-lg p-4 space-y-2">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Current</p>
                        <p className="text-white font-semibold">{isPct ? fmtPct(current) : fmt(current)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 text-xs">Scenario</p>
                        <p className="text-purple-400 font-semibold">{isPct ? fmtPct(scenario) : fmt(scenario)}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-medium text-center py-1 rounded ${
                      delta > 0 ? 'bg-emerald-500/10 text-emerald-400' : delta < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-500'
                    }`}>
                      {delta > 0 ? '+' : ''}{isPct ? fmtPct(delta) : fmt(delta)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {scenarioType === 'none' && (
            <p className="text-slate-600 text-sm text-center py-4">Select a scenario above to see the impact on your finances.</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs pb-4">
          Based on 2024 US tax brackets · Single filer · For educational purposes only — not financial advice.
        </p>

      </div>
    </div>
  );
}
