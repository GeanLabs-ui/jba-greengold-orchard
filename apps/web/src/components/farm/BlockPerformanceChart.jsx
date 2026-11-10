import { useState } from 'react';
import { ChartNoAxesCombined, Sprout, TrendingUp } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency as formatCedis } from '@/components/shared/format';
import { formatChartValue, nonNegativeChartRows, numericChartAxis } from '@/lib/analytics-chart-scale';

const COST = '#D64545';
const REVENUE = '#16A34A';
const YIELD = '#2563EB';
const wholeNumber = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function BlockPerformanceChart({ rows }) {
  const [blockMetric, setBlockMetric] = useState('all');
  const blockPerformanceRows = nonNegativeChartRows(rows, ['cost', 'revenue', 'yieldKg']);
  const moneyKeys = blockMetric === 'all' ? ['cost', 'revenue'] : blockMetric === 'yield' ? [] : [blockMetric];
  const moneyAxis = numericChartAxis(blockPerformanceRows, moneyKeys);
  const yieldAxis = numericChartAxis(blockPerformanceRows, ['yieldKg']);
  const blockTotals = blockPerformanceRows.reduce((totals, row) => ({ cost: totals.cost + row.cost, revenue: totals.revenue + row.revenue, yieldKg: totals.yieldKg + row.yieldKg }), { cost: 0, revenue: 0, yieldKg: 0 });
  const metricLeaderKey = { cost: 'cost', revenue: 'revenue', yield: 'yieldKg' }[blockMetric];
  const metricLeader = metricLeaderKey ? blockPerformanceRows.slice().sort((a, b) => b[metricLeaderKey] - a[metricLeaderKey])[0] : null;
  const blockSummaryText = !blockPerformanceRows.length ? 'Block performance will appear after activities are logged.' : blockMetric === 'all'
    ? `Charted totals: cost ${formatCedis(blockTotals.cost)}, revenue ${formatCedis(blockTotals.revenue)}, and yield ${wholeNumber(blockTotals.yieldKg)} Kg. Revenue is ${formatCedis(Math.abs(blockTotals.revenue - blockTotals.cost))} ${blockTotals.revenue >= blockTotals.cost ? 'above' : 'below'} cost.`
    : blockMetric === 'yield'
      ? `Total recorded yield: ${wholeNumber(blockTotals.yieldKg)} Kg. Highest yield: ${metricLeader?.blockLabel || '—'} (${wholeNumber(metricLeader?.yieldKg || 0)} Kg).`
      : `Total ${blockMetric}: ${formatCedis(blockTotals[blockMetric])}. Highest ${blockMetric}: ${metricLeader?.blockLabel || '—'} (${formatCedis(metricLeader?.[metricLeaderKey] || 0)}).`;

  return (
    <section className="analytics-block-chart overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <h2 className="text-[#1b5e20] text-section-title">Cost, Revenue &amp; Yield by Block</h2>
        <div className="analytics-legend" aria-label="Chart legend">
          {(blockMetric === 'all' || blockMetric === 'cost') && <span><i style={{ background: COST }} />Cost (₵)</span>}
          {(blockMetric === 'all' || blockMetric === 'yield') && <span><i className="rounded-full" style={{ background: YIELD }} />Yield (Kg)</span>}
          {(blockMetric === 'all' || blockMetric === 'revenue') && <span><i style={{ background: REVENUE }} />Revenue (₵)</span>}
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">Block chart metrics</span>
          <ChartNoAxesCombined className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
          <select value={blockMetric} onChange={(event) => setBlockMetric(event.target.value)} className="rounded border border-border bg-card pl-7 pr-5 text-caption">
            <option value="all">All metrics</option><option value="cost">Cost</option><option value="yield">Yield</option><option value="revenue">Revenue</option>
          </select>
          </label>
            </header>
      {blockPerformanceRows.length ? <div className="analytics-block-chart-body overflow-x-auto px-2 pb-2 pt-4"><div className="h-full min-w-[560px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={blockPerformanceRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#edf4ee" />
            <XAxis dataKey="blockLabel" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={10} tick={{ fontSize: 12 }} />
            <YAxis allowDataOverflow yAxisId="currency" hide={blockMetric === "yield"} {...moneyAxis} tickFormatter={(value) => formatChartValue(value, '', { compact: true })} axisLine={false} tickLine={false} width={60} tick={{ fontSize: 12 }} />
            <YAxis allowDataOverflow yAxisId="yield" orientation="right" hide={blockMetric !== "all" && blockMetric !== "yield"} {...yieldAxis} tickFormatter={(value) => formatChartValue(value, '', { compact: true })} axisLine={false} tickLine={false} width={48} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={(_, payload) => { const block = payload?.[0]?.payload; return block ? `${block.farmName} · ${block.blockLabel}` : ''; }} formatter={(value, name) => [formatChartValue(value, name === 'Yield (Kg)' ? 'kg' : 'GHS'), name]} cursor={{ stroke: '#d1d5db', fill: 'transparent' }} contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }} />
            {(blockMetric === 'all' || blockMetric === 'cost') && <Bar yAxisId="currency" dataKey="cost" name="Cost (₵)" fill={COST} maxBarSize={30} radius={[2, 2, 0, 0]} />}
            {(blockMetric === 'all' || blockMetric === 'revenue') && <Bar yAxisId="currency" dataKey="revenue" name="Revenue (₵)" fill={REVENUE} maxBarSize={30} radius={[2, 2, 0, 0]} />}
            {(blockMetric === 'all' || blockMetric === 'yield') && <Line yAxisId="yield" dataKey="yieldKg" name="Yield (Kg)" stroke={YIELD} strokeWidth={2} dot={{ r: 3, fill: YIELD }} activeDot={{ r: 5 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div></div> : <p role="status" className="p-4 text-sm text-muted-foreground">No recorded block activity for this selection.</p>}
      <footer className="farm-trend-summary analytics-block-summary">
        <TrendingUp className="farm-trend-summary-icon" aria-hidden="true" />
        <div><strong>Block Performance:</strong><p>{blockSummaryText}</p></div>
        <span className="farm-trend-tagline"><Sprout aria-hidden="true" />Healthy Farms<br />Brighter Tomorrows</span>
      </footer>
    </section>
  );
}
