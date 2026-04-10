'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { CHART_COLORS as C } from '@/lib/constants';
import { fmt, fmtPct } from '@/lib/formatters';
import { Slider, Divider, ChartTooltip } from '@/components/ui';
import { RiskToggle, AllocationDonut, TargetDonut, RebalancingAlert } from '@/components/retirement-ui';
import type { FinanceState } from '@/lib/useFinanceState';

type Props = Pick<FinanceState,
  | 'currentAge' | 'setCurrentAge'
  | 'retirementAge' | 'setRetirementAge'
  | 'returnRate' | 'setReturnRate'
  | 'cashRate' | 'setCashRate'
  | 'salaryGrowth' | 'setSalaryGrowth'
  | 'inflationRate' | 'setInflationRate'
  | 'riskTolerance' | 'setRiskTolerance'
  | 'showReal' | 'setShowReal'
  | 'showBands' | 'setShowBands'
  | 'projection'
  | 'projHigher'
  | 'projEarlier'
  | 'currentAllocation'
  | 'targetAlloc'
  | 'drift'
  | 'decadeProjection'
  | 'chartData'
>;

export default function InvestmentsTab(props: Props) {
  const {
    currentAge, setCurrentAge,
    retirementAge, setRetirementAge,
    returnRate, setReturnRate,
    cashRate, setCashRate,
    salaryGrowth, setSalaryGrowth,
    inflationRate, setInflationRate,
    riskTolerance, setRiskTolerance,
    showReal, setShowReal,
    showBands, setShowBands,
    projection,
    projHigher,
    projEarlier,
    currentAllocation,
    targetAlloc,
    drift,
    decadeProjection,
    chartData,
  } = props;

  return (
    <div className="space-y-6">

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
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                return `$${v}`;
              }}
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

      {/* Asset Allocation */}
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

      <Divider />
    </div>
  );
}
