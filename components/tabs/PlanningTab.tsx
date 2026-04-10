'use client';

import { fmt, fmtPct } from '@/lib/formatters';
import { NumInput, Slider } from '@/components/ui';
import type { FinanceState, SavingsGoal } from '@/lib/useFinanceState';

type Props = Pick<FinanceState,
  | 'salary'
  | 'contrib401k'
  | 'rothAnnual'
  | 'retirementAge'
  | 'monthlyCash'
  | 'monthlySurplus'
  | 'trueSavingsRate'
  | 'projection'
  | 'savingsGoals' | 'setSavingsGoals'
  | 'nextGoalId' | 'setNextGoalId'
  | 'scenarioType' | 'setScenarioType'
  | 'scenarioSalary' | 'setScenarioSalary'
  | 'scenarioExpenses' | 'setScenarioExpenses'
  | 'scenario401k' | 'setScenario401k'
  | 'scenarioRothAnnual' | 'setScenarioRothAnnual'
  | 'scenarioResults'
>;

export default function PlanningTab(props: Props) {
  const {
    salary,
    contrib401k,
    rothAnnual,
    retirementAge,
    monthlyCash,
    monthlySurplus,
    trueSavingsRate,
    projection,
    savingsGoals, setSavingsGoals,
    nextGoalId, setNextGoalId,
    scenarioType, setScenarioType,
    scenarioSalary, setScenarioSalary,
    scenarioExpenses, setScenarioExpenses,
    scenario401k, setScenario401k,
    scenarioRothAnnual, setScenarioRothAnnual,
    scenarioResults,
  } = props;

  return (
    <div className="space-y-6">

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
            const incompleteGoals = savingsGoals.filter((g: SavingsGoal) => g.current < g.target);
            const perGoalMonthly = incompleteGoals.length > 0 ? monthlyCash / incompleteGoals.length : 0;

            return savingsGoals.map((goal: SavingsGoal) => {
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
                      onChange={e => setSavingsGoals(gs => gs.map((g: SavingsGoal) => g.id === goal.id ? { ...g, name: e.target.value } : g))}
                      className="bg-transparent text-white font-semibold text-sm border-b border-transparent hover:border-slate-600 focus:border-emerald-400 focus:outline-none transition-colors flex-1"
                    />
                    <span className="text-slate-400 text-xs">{fmt(goalMonthly)}/mo</span>
                    <button
                      onClick={() => setSavingsGoals(gs => gs.filter((g: SavingsGoal) => g.id !== goal.id))}
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
                        onChange={e => setSavingsGoals(gs => gs.map((g: SavingsGoal) => g.id === goal.id ? { ...g, target: Number(e.target.value) } : g))}
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
                        onChange={e => setSavingsGoals(gs => gs.map((g: SavingsGoal) => g.id === goal.id ? { ...g, current: Number(e.target.value) } : g))}
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
              <p className="text-white font-bold">{fmt(savingsGoals.reduce((s: number, g: SavingsGoal) => s + g.target, 0))}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider">Total Saved</p>
              <p className="text-emerald-400 font-bold">{fmt(savingsGoals.reduce((s: number, g: SavingsGoal) => s + g.current, 0))}</p>
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

    </div>
  );
}
