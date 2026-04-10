'use client';

import { fmt, fmtPct } from '@/lib/formatters';
import { RowStat, Divider } from '@/components/ui';
import type { FinanceState } from '@/lib/useFinanceState';

type Props = Pick<FinanceState,
  | 'paySchedule'
  | 'firstPayDate' | 'setFirstPayDate'
  | 'expenseOverrides' | 'setExpenseOverrides'
  | 'overrideLabels' | 'setOverrideLabels'
  | 'totalExpenses'
  | 'tax'
  | 'timeline'
>;

export default function CashFlowTab(props: Props) {
  const {
    paySchedule,
    firstPayDate, setFirstPayDate,
    expenseOverrides, setExpenseOverrides,
    overrideLabels, setOverrideLabels,
    totalExpenses,
    tax,
    timeline,
  } = props;

  return (
    <div className="space-y-6">

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

        void diff;
        void yearEndDiff;
        void federalPace;
        void statePace;

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

    </div>
  );
}
