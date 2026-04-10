'use client';

import { useState } from 'react';
import { fmt } from '@/lib/formatters';

// ─── Layout Atoms ─────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-slate-700/60" />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

// ─── Data Display ─────────────────────────────────────────────────────────────

export function SummaryCard({
  title, value, sub, accent = 'text-emerald-400',
}: {
  title: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/60">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-bold mt-1.5 ${accent}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export function RowStat({
  label, value, accent = 'text-white', sub,
}: {
  label: string; value: string; accent?: string; sub?: string;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${accent}`}>{value}</span>
        {sub && <span className="text-slate-500 text-xs ml-2">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export function NumInput({
  label, value, onChange, prefix, step = 1, min = 0, max,
}: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full bg-slate-700/60 border border-slate-600 rounded-lg py-2 text-white text-sm
            focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40
            transition-colors ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  );
}

export function Slider({
  label, value, min, max, step = 1, onChange, display,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; display: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold tabular-nums">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: '#34d399' }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-slate-600 text-xs">{min}</span>
        <span className="text-slate-600 text-xs">{max}</span>
      </div>
    </div>
  );
}

// ─── Collapsible Category Group ───────────────────────────────────────────────

export function CollapsibleCategory({
  label, total, color = 'bg-emerald-400/70', children,
}: {
  label: string; total: number; color?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className={`text-slate-400 text-sm group-hover:text-white transition-colors`}>{label}</span>
          <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
        <span className="text-white text-sm font-medium">{fmt(total)}</span>
      </button>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1 mb-1">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: '100%' }} />
      </div>
      {open && (
        <div className="mt-2 mb-3 pl-3 border-l border-slate-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Chart Tooltips ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">Age {label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">{payload[0]?.payload?.name}</p>
      <span className="text-white font-medium">{fmt(payload[0]?.value)}</span>
    </div>
  );
}
