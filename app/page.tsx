'use client';

import { useState } from 'react';
import { useFinanceState } from '@/lib/useFinanceState';
import { fmt, fmtPct } from '@/lib/formatters';
import { SummaryCard } from '@/components/ui';
import DashboardTab from '@/components/tabs/DashboardTab';
import CashFlowTab from '@/components/tabs/CashFlowTab';
import InvestmentsTab from '@/components/tabs/InvestmentsTab';
import RetirementTab from '@/components/tabs/RetirementTab';
import PlanningTab from '@/components/tabs/PlanningTab';

const TABS = ['Dashboard', 'Cash Flow', 'Investments', 'Retirement', 'Planning'] as const;
type Tab = typeof TABS[number];

export default function Page() {
  const s = useFinanceState();
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

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
            <p className="text-3xl font-bold text-amber-400 tabular-nums">{fmtPct(s.tax.effectiveTaxRate)}</p>
            <p className="text-slate-500 text-xs">Marginal: {fmtPct(s.tax.marginalFederalRate * 100)} federal</p>
          </div>
        </div>

        {/* Summary Cards — persistent across all tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Monthly Take-Home"
            value={fmt(s.tax.monthlyNetIncome)}
            sub={`${fmt(s.tax.netIncome)} / year`}
            accent="text-emerald-400"
          />
          <SummaryCard
            title="Monthly Surplus"
            value={fmt(s.monthlySurplus)}
            sub={`True savings rate: ${fmtPct(s.trueSavingsRate)} of gross`}
            accent={s.monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <SummaryCard
            title="Annual Invested"
            value={fmt(s.projection.annualInvested)}
            sub="Employee + employer + Roth"
            accent="text-blue-400"
          />
          <SummaryCard
            title="Projected Net Worth"
            value={fmt(s.projection.finalValue)}
            sub={`At age ${s.retirementAge} · ${fmt(s.projection.finalCash)} in cash`}
            accent="text-purple-400"
          />
        </div>

        {/* Tab Bar */}
        <div className="border-b border-slate-700">
          <nav className="flex gap-1 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'Dashboard' && (
          <DashboardTab
            salary={s.salary} setSalary={s.setSalary}
            state={s.state} setState_={s.setState_}
            contrib401k={s.contrib401k} setContrib401k={s.setContrib401k}
            isRoth401k={s.isRoth401k} setIsRoth401k={s.setIsRoth401k}
            paySchedule={s.paySchedule} setPaySchedule={s.setPaySchedule}
            employerMatchRate={s.employerMatchRate} setEmployerMatchRate={s.setEmployerMatchRate}
            employerMatchCap={s.employerMatchCap} setEmployerMatchCap={s.setEmployerMatchCap}
            monthlyMedical={s.monthlyMedical} setMonthlyMedical={s.setMonthlyMedical}
            rent={s.rent} setRent={s.setRent}
            homeInsurance={s.homeInsurance} setHomeInsurance={s.setHomeInsurance}
            homeMaint={s.homeMaint} setHomeMaint={s.setHomeMaint}
            housing={s.housing}
            electric={s.electric} setElectric={s.setElectric}
            gasUtil={s.gasUtil} setGasUtil={s.setGasUtil}
            internet={s.internet} setInternet={s.setInternet}
            phone={s.phone} setPhone={s.setPhone}
            utilities={s.utilities}
            groceries={s.groceries} setGroceries={s.setGroceries}
            dining={s.dining} setDining={s.setDining}
            coffee={s.coffee} setCoffee={s.setCoffee}
            food={s.food}
            carPayment={s.carPayment} setCarPayment={s.setCarPayment}
            gasFuel={s.gasFuel} setGasFuel={s.setGasFuel}
            autoInsurance={s.autoInsurance} setAutoInsurance={s.setAutoInsurance}
            transportation={s.transportation}
            studentLoans={s.studentLoans} setStudentLoans={s.setStudentLoans}
            creditCards={s.creditCards} setCreditCards={s.setCreditCards}
            otherDebts={s.otherDebts} setOtherDebts={s.setOtherDebts}
            debts={s.debts}
            entertainment={s.entertainment} setEntertainment={s.setEntertainment}
            clothing={s.clothing} setClothing={s.setClothing}
            gym={s.gym} setGym={s.setGym}
            subscriptions={s.subscriptions} setSubscriptions={s.setSubscriptions}
            misc={s.misc}
            rothAnnual={s.rothAnnual} setRothAnnual={s.setRothAnnual}
            brokerageAnnual={s.brokerageAnnual} setBrokerageAnnual={s.setBrokerageAnnual}
            cashSavingsAnnual={s.cashSavingsAnnual} setCashSavingsAnnual={s.setCashSavingsAnnual}
            balance401k={s.balance401k} setBalance401k={s.setBalance401k}
            balanceRoth={s.balanceRoth} setBalanceRoth={s.setBalanceRoth}
            balanceBrokerage={s.balanceBrokerage} setBalanceBrokerage={s.setBalanceBrokerage}
            balanceCash={s.balanceCash} setBalanceCash={s.setBalanceCash}
            tax={s.tax}
            projection={s.projection}
            monthlyRoth={s.monthlyRoth}
            monthlyBrokerage={s.monthlyBrokerage}
            monthlyCash={s.monthlyCash}
            totalLivingExpenses={s.totalLivingExpenses}
            totalExpenses={s.totalExpenses}
            monthlySurplus={s.monthlySurplus}
            employerMatch={s.employerMatch}
            cashSavingsRate={s.cashSavingsRate}
            trueSavingsRate={s.trueSavingsRate}
            incomeBarData={s.incomeBarData}
          />
        )}

        {activeTab === 'Cash Flow' && (
          <CashFlowTab
            paySchedule={s.paySchedule}
            firstPayDate={s.firstPayDate} setFirstPayDate={s.setFirstPayDate}
            expenseOverrides={s.expenseOverrides} setExpenseOverrides={s.setExpenseOverrides}
            overrideLabels={s.overrideLabels} setOverrideLabels={s.setOverrideLabels}
            totalExpenses={s.totalExpenses}
            tax={s.tax}
            timeline={s.timeline}
          />
        )}

        {activeTab === 'Investments' && (
          <InvestmentsTab
            currentAge={s.currentAge} setCurrentAge={s.setCurrentAge}
            retirementAge={s.retirementAge} setRetirementAge={s.setRetirementAge}
            returnRate={s.returnRate} setReturnRate={s.setReturnRate}
            cashRate={s.cashRate} setCashRate={s.setCashRate}
            salaryGrowth={s.salaryGrowth} setSalaryGrowth={s.setSalaryGrowth}
            inflationRate={s.inflationRate} setInflationRate={s.setInflationRate}
            riskTolerance={s.riskTolerance} setRiskTolerance={s.setRiskTolerance}
            showReal={s.showReal} setShowReal={s.setShowReal}
            showBands={s.showBands} setShowBands={s.setShowBands}
            projection={s.projection}
            projHigher={s.projHigher}
            projEarlier={s.projEarlier}
            currentAllocation={s.currentAllocation}
            targetAlloc={s.targetAlloc}
            drift={s.drift}
            decadeProjection={s.decadeProjection}
            chartData={s.chartData}
          />
        )}

        {activeTab === 'Retirement' && (
          <RetirementTab
            salary={s.salary}
            retirementAge={s.retirementAge}
            withdrawalRate={s.withdrawalRate} setWithdrawalRate={s.setWithdrawalRate}
            retReturnRate={s.retReturnRate} setRetReturnRate={s.setRetReturnRate}
            targetConfidence={s.targetConfidence} setTargetConfidence={s.setTargetConfidence}
            retDuration={s.retDuration} setRetDuration={s.setRetDuration}
            socialSecurityMo={s.socialSecurityMo} setSocialSecurityMo={s.setSocialSecurityMo}
            pensionMo={s.pensionMo} setPensionMo={s.setPensionMo}
            projection={s.projection}
            targetAlloc={s.targetAlloc}
            withdrawalResult={s.withdrawalResult}
            comparisonTable={s.comparisonTable}
            trinityHeatMap={s.trinityHeatMap}
            maxSafeRate={s.maxSafeRate}
            monteCarloResult={s.monteCarloResult}
            retirementWaterfall={s.retirementWaterfall}
            taxComparison={s.taxComparison}
          />
        )}

        {activeTab === 'Planning' && (
          <PlanningTab
            salary={s.salary}
            contrib401k={s.contrib401k}
            rothAnnual={s.rothAnnual}
            retirementAge={s.retirementAge}
            monthlyCash={s.monthlyCash}
            monthlySurplus={s.monthlySurplus}
            trueSavingsRate={s.trueSavingsRate}
            projection={s.projection}
            savingsGoals={s.savingsGoals} setSavingsGoals={s.setSavingsGoals}
            nextGoalId={s.nextGoalId} setNextGoalId={s.setNextGoalId}
            scenarioType={s.scenarioType} setScenarioType={s.setScenarioType}
            scenarioSalary={s.scenarioSalary} setScenarioSalary={s.setScenarioSalary}
            scenarioExpenses={s.scenarioExpenses} setScenarioExpenses={s.setScenarioExpenses}
            scenario401k={s.scenario401k} setScenario401k={s.setScenario401k}
            scenarioRothAnnual={s.scenarioRothAnnual} setScenarioRothAnnual={s.setScenarioRothAnnual}
            scenarioResults={s.scenarioResults}
          />
        )}

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs pb-4">
          Based on 2024 US tax brackets · Single filer · For educational purposes only — not financial advice.
        </p>

      </div>
    </div>
  );
}
