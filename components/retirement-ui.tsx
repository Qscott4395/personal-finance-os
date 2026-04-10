'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fmt, fmtPct } from '@/lib/formatters';
import type { RiskTolerance, DriftResult } from '@/lib/allocation';

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
