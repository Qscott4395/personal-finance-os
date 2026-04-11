'use client';

import { fmt, fmtPct } from '@/lib/formatters';
import { Slider, NumInput, Divider } from '@/components/ui';
import { SummaryCard } from '@/components/ui';
import { HeatMapGrid, MonteCarloHistogram, WaterfallChart, PortfolioBalanceChart } from '@/components/retirement-ui';
import type { FinanceState } from '@/lib/useFinanceState';

type Props = Pick<FinanceState,
  | 'salary'
  | 'currentAge'
  | 'retirementAge'
  | 'inflationRate'
  | 'withdrawalRate' | 'setWithdrawalRate'
  | 'retReturnRate' | 'setRetReturnRate'
  | 'targetConfidence' | 'setTargetConfidence'
  | 'retDuration'
  | 'planThroughAge' | 'setPlanThroughAge'
  | 'wantedRetIncome' | 'setWantedRetIncome'
  | 'socialSecurityMo' | 'setSocialSecurityMo'
  | 'pensionMo' | 'setPensionMo'
  | 'projection'
  | 'targetAlloc'
  | 'withdrawalResult'
  | 'comparisonTable'
  | 'trinityHeatMap'
  | 'maxSafeRate'
  | 'monteCarloResult'
  | 'retirementWaterfall'
  | 'desiredIncomeWaterfall'
  | 'desiredIncomeAtRetirement'
  | 'taxComparison'
>;

export default function RetirementTab(props: Props) {
  const {
    salary,
    currentAge,
    retirementAge,
    inflationRate,
    withdrawalRate, setWithdrawalRate,
    retReturnRate, setRetReturnRate,
    targetConfidence, setTargetConfidence,
    retDuration,
    planThroughAge, setPlanThroughAge,
    wantedRetIncome, setWantedRetIncome,
    socialSecurityMo, setSocialSecurityMo,
    pensionMo, setPensionMo,
    projection,
    targetAlloc,
    withdrawalResult,
    comparisonTable,
    trinityHeatMap,
    maxSafeRate,
    monteCarloResult,
    retirementWaterfall,
    desiredIncomeWaterfall,
    desiredIncomeAtRetirement,
    taxComparison,
  } = props;

  return (
    <div className="space-y-6">

      {/* Retirement Income Waterfall */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">Retirement Income Waterfall</h2>
          <p className="text-slate-400 text-sm">Income sources and tax-efficient withdrawal order</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <div>
            <NumInput label="Desired Annual Income" value={wantedRetIncome} onChange={setWantedRetIncome} prefix="$" step={5000} />
            <p className="text-slate-600 text-[10px] mt-1">How much you want to live on per year in retirement (today's dollars)</p>
          </div>
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

        {/* Effective withdrawal indicator */}
        {(() => {
          const yearsToRetirement = Math.max(0, retirementAge - currentAge);
          const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsToRetirement);
          const inflationAdjusted = Math.round(wantedRetIncome * inflationMultiplier);
          const pctBased = Math.round(projection.finalValue * (withdrawalRate / 100));
          const effective = Math.max(pctBased, inflationAdjusted);
          const usingDesired = inflationAdjusted > pctBased;
          return (
            <div className="space-y-2">
              <div className="bg-slate-700/40 rounded-lg p-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider">Desired Income at Age {retirementAge}: </span>
                    <span className="text-white font-bold tabular-nums">{fmt(inflationAdjusted)}</span>
                    <span className="text-slate-500"> / yr ({fmt(Math.round(inflationAdjusted / 12))} / mo)</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="text-slate-400">
                      *{fmt(wantedRetIncome)} today + {inflationRate}% inflation × {yearsToRetirement} yrs
                    </span>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg p-3 text-xs ${usingDesired ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-700/40'}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider">Year 1 Annual Spend: </span>
                    <span className="text-white font-bold tabular-nums">{fmt(effective)}</span>
                    <span className="text-slate-500"> / yr ({fmt(Math.round(effective / 12))} / mo)</span>
                  </div>
                  <div className="text-slate-500">
                    {usingDesired ? (
                      <span className="text-amber-400">Using desired income — {withdrawalRate}% of portfolio ({fmt(pctBased)}) is below your inflation-adjusted target</span>
                    ) : (
                      <span className="text-slate-400">Using {withdrawalRate}% withdrawal rate — exceeds your {fmt(inflationAdjusted)} inflation-adjusted target</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Waterfall chart */}
        <WaterfallChart data={retirementWaterfall} />

        {/* Portfolio balance chart — withdrawal rate based */}
        <PortfolioBalanceChart data={retirementWaterfall} />

        {/* Portfolio balance chart — desired income based */}
        <div className="space-y-2">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">
            Portfolio Balance at {fmt(desiredIncomeAtRetirement)}/yr Desired Income
            <span className="normal-case text-slate-600 ml-1">
              — *{fmt(wantedRetIncome)} today + inflation to age {retirementAge}
            </span>
          </p>
          <PortfolioBalanceChart data={desiredIncomeWaterfall} />
          {(() => {
            const lastDesired = desiredIncomeWaterfall[desiredIncomeWaterfall.length - 1];
            const lastMain = retirementWaterfall[retirementWaterfall.length - 1];
            if (!lastDesired || !lastMain) return null;
            const diff = lastDesired.remainingTotal - lastMain.remainingTotal;
            return (
              <div className="bg-slate-700/40 rounded-lg p-3 text-xs">
                <span className="text-slate-400">At desired income ({fmt(desiredIncomeAtRetirement)}/yr): </span>
                <span className={lastDesired.remainingTotal > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {lastDesired.remainingTotal > 0
                    ? `${fmt(lastDesired.remainingTotal)} remaining at age ${planThroughAge}`
                    : `Portfolio depletes before age ${planThroughAge}`}
                </span>
                {diff !== 0 && lastMain.remainingTotal > 0 && (
                  <span className="text-slate-500 ml-2">
                    ({diff > 0 ? '+' : ''}{fmt(diff)} vs {withdrawalRate}% withdrawal)
                  </span>
                )}
              </div>
            );
          })()}
        </div>

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

      {/* Estate / Legacy Value */}
      {(() => {
        const lastYear = retirementWaterfall[retirementWaterfall.length - 1];
        if (!lastYear) return null;
        const deathAge = planThroughAge;
        const estateTotal = lastYear.remainingTotal;
        const rothEstate = lastYear.remainingRoth;
        const k401Estate = lastYear.remaining401k;
        const brokerageEstate = lastYear.remainingBrokerage;
        const cashEstate = lastYear.remainingCash;
        // Tax estimates for heirs
        const k401HeirTax = k401Estate * 0.22; // heirs pay ordinary income tax ~22%
        const brokerageStepUp = 0; // stepped-up basis = no cap gains at death
        const estateAfterTax = rothEstate + cashEstate + brokerageEstate + (k401Estate - k401HeirTax);
        void brokerageStepUp;
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
                  <p className="text-slate-600 text-[10px]">* 22% heir income tax is an estimate. Actual rate depends on heir&apos;s income bracket. Federal estate tax (~40%) only applies above $13.6M exemption (2024).</p>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Withdrawal Rate Modeling */}
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

      {/* Portfolio Survivability — Trinity Study & Monte Carlo */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/60 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">Portfolio Survivability</h2>
          <p className="text-slate-400 text-sm">Trinity Study data + Monte Carlo simulation</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <Slider
            label="Plan Through Age"
            value={planThroughAge} min={70} max={100} step={1}
            onChange={setPlanThroughAge}
            display={`Age ${planThroughAge} (${retDuration} yrs)`}
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

    </div>
  );
}
