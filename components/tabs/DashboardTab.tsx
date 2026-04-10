'use client';

import {
  BarChart, Bar, Cell,
  PieChart, Pie, Cell as PieCell,
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { STATES } from '@/lib/constants';
import { fmt, fmtPct } from '@/lib/formatters';
import {
  NumInput, Slider, Label,
  RowStat, Divider, BarTooltip, CollapsibleCategory,
} from '@/components/ui';
import type { FinanceState } from '@/lib/useFinanceState';

type Props = Pick<FinanceState,
  // Income state
  | 'salary' | 'setSalary'
  | 'state' | 'setState_'
  | 'contrib401k' | 'setContrib401k'
  | 'isRoth401k' | 'setIsRoth401k'
  | 'paySchedule' | 'setPaySchedule'
  | 'employerMatchRate' | 'setEmployerMatchRate'
  | 'employerMatchCap' | 'setEmployerMatchCap'
  | 'monthlyMedical' | 'setMonthlyMedical'
  // Expenses — Housing
  | 'rent' | 'setRent'
  | 'homeInsurance' | 'setHomeInsurance'
  | 'homeMaint' | 'setHomeMaint'
  | 'housing'
  // Expenses — Utilities
  | 'electric' | 'setElectric'
  | 'gasUtil' | 'setGasUtil'
  | 'internet' | 'setInternet'
  | 'phone' | 'setPhone'
  | 'utilities'
  // Expenses — Food
  | 'groceries' | 'setGroceries'
  | 'dining' | 'setDining'
  | 'coffee' | 'setCoffee'
  | 'food'
  // Expenses — Transportation
  | 'carPayment' | 'setCarPayment'
  | 'gasFuel' | 'setGasFuel'
  | 'autoInsurance' | 'setAutoInsurance'
  | 'transportation'
  // Expenses — Debts
  | 'studentLoans' | 'setStudentLoans'
  | 'creditCards' | 'setCreditCards'
  | 'otherDebts' | 'setOtherDebts'
  | 'debts'
  // Expenses — Misc
  | 'entertainment' | 'setEntertainment'
  | 'clothing' | 'setClothing'
  | 'gym' | 'setGym'
  | 'subscriptions' | 'setSubscriptions'
  | 'misc'
  // Investments
  | 'rothAnnual' | 'setRothAnnual'
  | 'brokerageAnnual' | 'setBrokerageAnnual'
  | 'cashSavingsAnnual' | 'setCashSavingsAnnual'
  | 'balance401k' | 'setBalance401k'
  | 'balanceRoth' | 'setBalanceRoth'
  | 'balanceBrokerage' | 'setBalanceBrokerage'
  | 'balanceCash' | 'setBalanceCash'
  // Derived
  | 'tax'
  | 'projection'
  | 'monthlyRoth'
  | 'monthlyBrokerage'
  | 'monthlyCash'
  | 'totalLivingExpenses'
  | 'totalExpenses'
  | 'monthlySurplus'
  | 'employerMatch'
  | 'cashSavingsRate'
  | 'trueSavingsRate'
  | 'incomeBarData'
>;

export default function DashboardTab(props: Props) {
  const {
    salary, setSalary,
    state, setState_,
    contrib401k, setContrib401k,
    isRoth401k, setIsRoth401k,
    paySchedule, setPaySchedule,
    employerMatchRate, setEmployerMatchRate,
    employerMatchCap, setEmployerMatchCap,
    monthlyMedical, setMonthlyMedical,
    rent, setRent,
    homeInsurance, setHomeInsurance,
    homeMaint, setHomeMaint,
    housing,
    electric, setElectric,
    gasUtil, setGasUtil,
    internet, setInternet,
    phone, setPhone,
    utilities,
    groceries, setGroceries,
    dining, setDining,
    coffee, setCoffee,
    food,
    carPayment, setCarPayment,
    gasFuel, setGasFuel,
    autoInsurance, setAutoInsurance,
    transportation,
    studentLoans, setStudentLoans,
    creditCards, setCreditCards,
    otherDebts, setOtherDebts,
    debts,
    entertainment, setEntertainment,
    clothing, setClothing,
    gym, setGym,
    subscriptions, setSubscriptions,
    misc,
    rothAnnual, setRothAnnual,
    brokerageAnnual, setBrokerageAnnual,
    cashSavingsAnnual, setCashSavingsAnnual,
    balance401k, setBalance401k,
    balanceRoth, setBalanceRoth,
    balanceBrokerage, setBalanceBrokerage,
    balanceCash, setBalanceCash,
    tax,
    projection,
    monthlyRoth,
    monthlyBrokerage,
    monthlyCash,
    totalLivingExpenses,
    totalExpenses,
    monthlySurplus,
    employerMatch,
    cashSavingsRate,
    trueSavingsRate,
    incomeBarData,
  } = props;

  return (
    <div className="space-y-6">
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
                onChange={e => setState_(e.target.value as Parameters<typeof setState_>[0])}
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
    </div>
  );
}
