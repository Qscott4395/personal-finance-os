'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmt, fmtShort } from '@/lib/formatters';
import { SummaryCard, NumInput, Slider } from '@/components/ui';
import type { FinanceState } from '@/lib/useFinanceState';

const DEBT_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#38bdf8'];

type Props = Pick<FinanceState,
  | 'debtEntries' | 'setDebtEntries'
  | 'nextDebtId' | 'setNextDebtId'
  | 'debtExtraPayment' | 'setDebtExtraPayment'
  | 'debtStrategy' | 'setDebtStrategy'
  | 'debtPayoffResult'
  | 'debtComparison'
  | 'monthlySurplus'
>;

export default function DebtStrategyTab(props: Props) {
  const {
    debtEntries, setDebtEntries,
    nextDebtId, setNextDebtId,
    debtExtraPayment, setDebtExtraPayment,
    debtStrategy, setDebtStrategy,
    debtPayoffResult,
    debtComparison,
    monthlySurplus,
  } = props;

  const totalDebt = debtEntries.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debtEntries.reduce((s, d) => s + d.minPayment, 0);

  // Build chart data from timeline
  const chartData = debtPayoffResult.timeline
    .filter((_, i) => i % Math.max(1, Math.floor(debtPayoffResult.timeline.length / 120)) === 0 || i === debtPayoffResult.timeline.length - 1)
    .map(m => {
      const point: Record<string, number> = { month: m.month };
      m.debts.forEach(d => { point[d.name] = d.endBalance; });
      return point;
    });

  const updateDebt = (id: number, field: string, value: string | number) => {
    setDebtEntries(entries => entries.map(d =>
      d.id === id ? { ...d, [field]: field === 'name' ? value : Number(value) || 0 } : d
    ));
  };

  const removeDebt = (id: number) => {
    setDebtEntries(entries => entries.filter(d => d.id !== id));
  };

  const addDebt = () => {
    setDebtEntries(entries => [...entries, { id: nextDebtId, name: 'New Debt', balance: 0, apr: 0, minPayment: 0 }]);
    setNextDebtId(n => n + 1);
  };

  return (
    <div className="space-y-6">

      {/* ── Debt Input Table ── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Your Debts</h2>
          <p className="text-slate-400 text-sm">Enter each debt with its current balance, APR, and minimum payment</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider text-xs border-b border-slate-700">
                <th className="text-left py-2 px-2 font-medium">Name</th>
                <th className="text-right py-2 px-2 font-medium">Balance</th>
                <th className="text-right py-2 px-2 font-medium">APR %</th>
                <th className="text-right py-2 px-2 font-medium">Min Payment</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {debtEntries.map((d, i) => (
                <tr key={d.id} className="border-b border-slate-700/40">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={d.name}
                      onChange={e => updateDebt(d.id, 'name', e.target.value)}
                      className="bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-sm w-full
                        focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={d.balance}
                      onChange={e => updateDebt(d.id, 'balance', e.target.value)}
                      className="bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-sm w-24 text-right tabular-nums
                        focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={d.apr}
                      step={0.1}
                      onChange={e => updateDebt(d.id, 'apr', e.target.value)}
                      className="bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-sm w-20 text-right tabular-nums
                        focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={d.minPayment}
                      onChange={e => updateDebt(d.id, 'minPayment', e.target.value)}
                      className="bg-slate-700/60 border border-slate-600 rounded-lg py-1.5 px-2 text-white text-sm w-24 text-right tabular-nums
                        focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => removeDebt(d.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addDebt}
          className="text-xs font-medium bg-emerald-500/20 border border-emerald-500/40 text-emerald-400
            rounded-lg px-4 py-2 hover:bg-emerald-500/30 transition-colors"
        >
          + Add Debt
        </button>
      </div>

      {/* ── Strategy Controls ── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Payoff Strategy</h2>
          <p className="text-slate-400 text-sm">Choose your approach and set extra monthly payment</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setDebtStrategy('avalanche')}
            className={`flex-1 min-w-[200px] rounded-lg border p-4 text-left transition-colors ${
              debtStrategy === 'avalanche'
                ? 'bg-purple-500/15 border-purple-500/50 text-white'
                : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:text-white'
            }`}
          >
            <p className="font-semibold text-sm">Avalanche</p>
            <p className="text-[11px] mt-1 opacity-70">Pay highest interest first — saves the most money</p>
          </button>
          <button
            onClick={() => setDebtStrategy('snowball')}
            className={`flex-1 min-w-[200px] rounded-lg border p-4 text-left transition-colors ${
              debtStrategy === 'snowball'
                ? 'bg-purple-500/15 border-purple-500/50 text-white'
                : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:text-white'
            }`}
          >
            <p className="font-semibold text-sm">Snowball</p>
            <p className="text-[11px] mt-1 opacity-70">Pay smallest balance first — fastest wins for motivation</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl items-end">
          <Slider
            label="Extra Monthly Payment"
            value={debtExtraPayment} min={0} max={Math.max(2000, Math.round(monthlySurplus * 1.5))} step={25}
            onChange={setDebtExtraPayment}
            display={fmt(debtExtraPayment)}
          />
          <button
            onClick={() => setDebtExtraPayment(Math.max(0, Math.round(monthlySurplus)))}
            className="text-xs font-medium bg-blue-500/20 border border-blue-500/40 text-blue-400
              rounded-lg px-4 py-2 h-fit hover:bg-blue-500/30 transition-colors"
          >
            Use Monthly Surplus ({fmt(Math.max(0, Math.round(monthlySurplus)))})
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Debt"
          value={fmt(totalDebt)}
          sub={`${debtEntries.length} accounts`}
          accent="text-red-400"
        />
        <SummaryCard
          title="Monthly Payment"
          value={fmt(totalMinPayment + debtExtraPayment)}
          sub={`${fmt(totalMinPayment)} min + ${fmt(debtExtraPayment)} extra`}
          accent="text-amber-400"
        />
        <SummaryCard
          title="Debt-Free Date"
          value={debtPayoffResult.debtFreeDate}
          sub={debtPayoffResult.monthsToPayoff > 0
            ? `${debtPayoffResult.monthsToPayoff} months (${(debtPayoffResult.monthsToPayoff / 12).toFixed(1)} years)`
            : 'Already debt-free'}
          accent="text-emerald-400"
        />
        <SummaryCard
          title="Total Interest"
          value={fmt(debtPayoffResult.totalInterestPaid)}
          sub={`Using ${debtStrategy} strategy`}
          accent="text-red-400"
        />
      </div>

      {/* ── Payoff Timeline Chart ── */}
      {chartData.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Payoff Timeline</h2>
            <p className="text-slate-400 text-sm">Remaining balance by debt over time</p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false} tickLine={false}
                label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
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
                labelFormatter={(l) => `Month ${l}`}
              />
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '11px', paddingTop: '8px' }}
              />
              {debtEntries.map((d, i) => (
                <Area
                  key={d.id}
                  type="monotone"
                  dataKey={d.name}
                  stackId="1"
                  stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                  fill={DEBT_COLORS[i % DEBT_COLORS.length]}
                  fillOpacity={0.4}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Avalanche vs Snowball Comparison ── */}
      {debtComparison.interestSaved !== 0 || debtComparison.monthsSaved !== 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Strategy Comparison</h2>
            <p className="text-slate-400 text-sm">Avalanche vs Snowball side by side</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['avalanche', 'snowball'] as const).map(s => {
              const r = debtComparison[s];
              const isWinner = s === 'avalanche'
                ? debtComparison.interestSaved >= 0
                : debtComparison.interestSaved < 0;
              return (
                <div key={s} className={`rounded-lg p-4 border ${
                  isWinner ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-700/40 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-semibold capitalize">{s}</p>
                    {isWinner && <span className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold">Best</span>}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Months to payoff</span>
                      <span className="text-white tabular-nums">{r.monthsToPayoff}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total interest</span>
                      <span className="text-white tabular-nums">{fmt(r.totalInterestPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Debt-free date</span>
                      <span className="text-white">{r.debtFreeDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-700/40 rounded-lg p-3 text-xs">
            {debtComparison.interestSaved > 0 ? (
              <p className="text-emerald-400">
                Avalanche saves <strong>{fmt(debtComparison.interestSaved)}</strong> in interest
                {debtComparison.monthsSaved > 0 && <> and <strong>{debtComparison.monthsSaved} months</strong></>}.
              </p>
            ) : debtComparison.interestSaved < 0 ? (
              <p className="text-emerald-400">
                Snowball saves <strong>{fmt(Math.abs(debtComparison.interestSaved))}</strong> in interest
                {debtComparison.monthsSaved < 0 && <> and <strong>{Math.abs(debtComparison.monthsSaved)} months</strong></>}.
              </p>
            ) : (
              <p className="text-slate-400">Both strategies produce the same result for your debt profile.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Payoff Order Table ── */}
      {debtPayoffResult.perDebt.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Payoff Order</h2>
            <p className="text-slate-400 text-sm">
              {debtStrategy === 'avalanche' ? 'Highest interest rate first' : 'Smallest balance first'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700">
                  <th className="text-left py-2 px-3 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">Debt</th>
                  <th className="text-right py-2 px-3 font-medium">Balance</th>
                  <th className="text-right py-2 px-3 font-medium">APR</th>
                  <th className="text-right py-2 px-3 font-medium">Payoff Month</th>
                  <th className="text-right py-2 px-3 font-medium">Interest Paid</th>
                </tr>
              </thead>
              <tbody>
                {debtPayoffResult.perDebt.map((d, i) => (
                  <tr key={d.id} className={`border-b border-slate-700/40 ${i === 0 ? 'bg-purple-500/10' : ''}`}>
                    <td className="py-2 px-3 text-purple-400 font-bold">{d.payoffOrder}</td>
                    <td className="py-2 px-3 text-white font-medium">{d.name}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{fmt(d.originalBalance)}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                      {debtEntries.find(e => e.id === d.id)?.apr ?? 0}%
                    </td>
                    <td className="py-2 px-3 text-right text-white tabular-nums">
                      Month {d.payoffMonth}
                      <span className="text-slate-500 ml-1">({(d.payoffMonth / 12).toFixed(1)} yr)</span>
                    </td>
                    <td className="py-2 px-3 text-right text-red-400 tabular-nums">{fmt(d.totalInterestPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
