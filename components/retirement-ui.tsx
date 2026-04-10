'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { fmt, fmtPct, fmtShort } from '@/lib/formatters';
import type { RiskTolerance, DriftResult } from '@/lib/allocation';
import type { TrinityResult, MonteCarloResult } from '@/lib/survivability';
import type { RetirementYearIncome } from '@/lib/retirement-income';

// ─── Risk Tolerance Toggle ───────────────────────────────────────────────────

export function RiskToggle({
  value, onChange,
}: {
  value: RiskTolerance; onChange: (v: RiskTolerance) => void;
}) {
  const options: { key: RiskTolerance; label: string }[] = [
    { key: 'conservative', label: 'Conservative' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'aggressive', label: 'Aggressive' },
  ];
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-600 text-xs font-medium">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 transition-colors ${
            value === o.key
              ? 'bg-purple-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Allocation Donut Chart ──────────────────────────────────────────────────

export function AllocationDonut({
  data, label,
}: {
  data: { name: string; value: number; color: string }[];
  label?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-[140px] h-[140px]">
        <p className="text-slate-600 text-xs">No data</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      {label && <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>}
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={38} outerRadius={60}
            dataKey="value"
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.85} />
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
  );
}

// ─── Target Allocation Donut (percentage-based) ──────────────────────────────

export function TargetDonut({
  equity, bonds, cash, label,
}: {
  equity: number; bonds: number; cash: number; label?: string;
}) {
  const data = [
    { name: 'Equity', value: equity, color: '#60a5fa' },
    { name: 'Bonds', value: bonds, color: '#a78bfa' },
    { name: 'Cash', value: cash, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="text-center">
      {label && <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>}
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={38} outerRadius={60}
            dataKey="value"
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => `${v}%`}
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: '#e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Rebalancing Alert ───────────────────────────────────────────────────────

export function RebalancingAlert({ drift }: { drift: DriftResult }) {
  if (!drift.needsRebalancing) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
        <p className="text-emerald-400 text-xs font-medium">
          Portfolio is within target allocation (max drift: {fmtPct(drift.maxDrift)})
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
      <p className="text-amber-400 text-xs font-semibold">
        Rebalancing recommended — max drift: {fmtPct(drift.maxDrift)}
      </p>
      <div className="space-y-1">
        {drift.drifts.filter(d => d.drift > 5).map(d => (
          <p key={d.bucket} className="text-slate-400 text-xs">
            {d.bucket}: {fmtPct(d.current)} current → {fmtPct(d.target)} target
            <span className={`ml-1 font-medium ${d.current > d.target ? 'text-red-400' : 'text-emerald-400'}`}>
              ({d.current > d.target ? 'over' : 'under'} by {fmtPct(d.drift)})
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Trinity Study Heat Map ──────────────────────────────────────────────────

function getHeatColor(rate: number): string {
  if (rate >= 95) return 'bg-emerald-500/60';
  if (rate >= 90) return 'bg-emerald-500/40';
  if (rate >= 80) return 'bg-lime-500/40';
  if (rate >= 70) return 'bg-yellow-500/40';
  if (rate >= 60) return 'bg-amber-500/40';
  if (rate >= 50) return 'bg-orange-500/40';
  return 'bg-red-500/40';
}

export function HeatMapGrid({
  data, rates, allocations, currentRate, currentAlloc,
}: {
  data: TrinityResult[];
  rates: number[];
  allocations: number[];
  currentRate?: number;
  currentAlloc?: number;
}) {
  const lookup = new Map<string, number>();
  for (const d of data) {
    lookup.set(`${d.withdrawalRate}-${d.equityPct}`, d.successRate);
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="py-1.5 px-2 text-slate-500 text-left font-medium">Rate / Equity</th>
            {allocations.map(a => (
              <th key={a} className={`py-1.5 px-3 text-center font-medium ${
                currentAlloc !== undefined && Math.abs(a - currentAlloc) < 13 ? 'text-purple-400' : 'text-slate-500'
              }`}>
                {a}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rates.map(r => (
            <tr key={r}>
              <td className={`py-1.5 px-2 font-medium ${
                currentRate !== undefined && Math.abs(r - currentRate) < 0.26 ? 'text-purple-400' : 'text-slate-400'
              }`}>
                {r}%
              </td>
              {allocations.map(a => {
                const sr = lookup.get(`${r}-${a}`) ?? 0;
                const isHighlight = currentRate !== undefined && currentAlloc !== undefined
                  && Math.abs(r - currentRate) < 0.26 && Math.abs(a - currentAlloc) < 13;
                return (
                  <td key={a} className={`py-1.5 px-3 text-center tabular-nums rounded ${getHeatColor(sr)} ${
                    isHighlight ? 'ring-1 ring-purple-400' : ''
                  }`}>
                    <span className="text-white font-medium">{sr}%</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Monte Carlo Histogram ───────────────────────────────────────────────────

export function MonteCarloHistogram({
  result, loading, retirementAge,
}: {
  result: MonteCarloResult | null;
  loading: boolean;
  retirementAge: number;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-slate-500 text-sm animate-pulse">Running 10,000 simulations...</p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${
          result.successRate >= 90 ? 'text-emerald-400' : result.successRate >= 75 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {result.successRate}%
        </span>
        <span className="text-slate-400 text-sm">success rate across 10,000 simulations</span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={result.histogram} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="binLabel" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={40} />
          <YAxis hide />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {result.histogram.map((entry, i) => (
              <Cell key={i} fill={entry.isFailure ? '#f87171' : '#60a5fa'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-slate-500 uppercase tracking-wider">Median Ending</p>
          <p className="text-white font-semibold">{fmt(result.medianEndingBalance)}</p>
        </div>
        <div>
          <p className="text-slate-500 uppercase tracking-wider">10th Percentile</p>
          <p className="text-slate-300 font-semibold">{fmt(result.percentiles.p10)}</p>
        </div>
        {result.medianFailureAge !== null && (
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Median Failure Age</p>
            <p className="text-red-400 font-semibold">Age {retirementAge + result.medianFailureAge}</p>
          </div>
        )}
        {result.worstCaseFailureAge !== null && (
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Worst Failure</p>
            <p className="text-red-400 font-semibold">Age {retirementAge + result.worstCaseFailureAge}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Retirement Income Waterfall Chart ────────────────────────────────────────

const WATERFALL_COLORS = {
  socialSecurity: '#fb923c',
  pension: '#f472b6',
  k401: '#60a5fa',
  roth: '#34d399',
  brokerage: '#fbbf24',
  cash: '#94a3b8',
};

export function WaterfallChart({ data }: { data: RetirementYearIncome[] }) {
  if (data.length === 0) return null;

  // Sample every 5 years to avoid overcrowding
  const sampled = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sampled} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="age"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false} tickLine={false}
          label={{ value: 'Age', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickFormatter={fmtShort}
          width={55}
          stroke="#334155"
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v: number) => fmt(v)}
        />
        <Legend
          wrapperStyle={{ color: '#94a3b8', fontSize: '11px', paddingTop: '8px' }}
          formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
        />
        <Bar dataKey="socialSecurity" stackId="1" fill={WATERFALL_COLORS.socialSecurity} name="Social Security" />
        <Bar dataKey="pension" stackId="1" fill={WATERFALL_COLORS.pension} name="Pension" />
        <Bar dataKey="k401Withdrawal" stackId="1" fill={WATERFALL_COLORS.k401} name="401(k)" />
        <Bar dataKey="rothWithdrawal" stackId="1" fill={WATERFALL_COLORS.roth} name="Roth IRA" />
        <Bar dataKey="brokerageWithdrawal" stackId="1" fill={WATERFALL_COLORS.brokerage} name="Brokerage" />
        <Bar dataKey="cashWithdrawal" stackId="1" fill={WATERFALL_COLORS.cash} name="Cash" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
