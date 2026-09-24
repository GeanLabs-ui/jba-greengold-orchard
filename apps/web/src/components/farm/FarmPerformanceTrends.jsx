import AnalyticsChartRotation from './AnalyticsChartRotation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChartNoAxesColumnIncreasing, TrendingUp, Sprout } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { measurementScales } from '@/lib/analytics-chart-scale';
import { buildFarmOperationsAnalytics } from '@/lib/farm-operations-analytics';
import { buildFarmPerformanceTrends, summarizeYearlyTrend, summarizeMonthlyTrend } from '@/lib/farm-performance-trends';
import { formatCurrency } from '@/components/shared/format';
import './farm-performance-trends.css';

const METRICS = [
  { key: 'cost', name: 'Cost (GHS)', color: '#ff304b' },
  { key: 'revenue', name: 'Revenue (GHS)', color: '#24a657' },
  { key: 'profit', name: 'Profit (GHS)', color: '#ffb800' },
  { key: 'yieldTonnes', name: 'Yield (tonnes)', color: '#1673ff' },
];
// Performance totals are operational values. Keep every chart label whole so the
// visual scale never implies precision that the dashboard does not display.
const whole = (value) => Math.round(Number(value) || 0).toLocaleString('en-US');

function MoneyTick({ x, y, payload }) {
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={payload.value < 0 ? '#ef3340' : '#536a9b'}>{whole(payload.value)}</text>;
}

function TrendValueLabel({ x, y, width = 0, value, color, line, compact }) {
  if (value == null || Number(value) === 0) return null;
  return <text x={Number(x) + Number(width) / 2} y={Number(y) + (Number(value) < 0 ? 17 : line ? -18 : -10)} textAnchor="middle" fill={Number(value) < 0 ? '#ff304b' : color} fontSize={12} fontWeight={700}>{compact && value >= 100000 ? `${(value / 1000000).toFixed(1)}M` : whole(value)}</text>;
}

function TrendChart({ rows, monthly, title, rangeControl }) {
  const scales = measurementScales(rows);
  const metrics = METRICS;
  {
    const peak = Math.max(1, ...rows.flatMap(row => [row.cost || 0, row.revenue || 0, Math.abs(row.profit || 0)]));
    const rawStep = peak / 5;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 2.5, 5, 10].find(factor => factor * magnitude >= rawStep) * magnitude;
    const low = Math.min(-step * 2, Math.floor(Math.min(0, ...rows.map(row => row.profit || 0)) / step) * step);
    const high = Math.ceil(peak * 1.15 / step) * step;
    scales.money = { domain: [low, high], ticks: Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + i * step) };
  }
  return <article className={`farm-trend-card ${monthly ? 'farm-trend-card--monthly' : 'farm-trend-card--yearly'}`}>
    <div className="farm-trend-heading">
      <ChartNoAxesColumnIncreasing className="farm-trend-icon" aria-hidden="true" />
      <div><h3>{title}</h3>
      {monthly && <p>Cost, yield, revenue and profit from January to December</p>}</div>
      {rangeControl}
    </div>
    <div className="farm-trend-legend">{metrics.map((metric) => <span key={metric.key}><i style={{ background: metric.color }} />{metric.name}</span>)}</div>
    <div className="analytics-plot-scroll"><div className="farm-trend-plot" style={{ minWidth: monthly ? 960 : Math.max(760, rows.length * 145 + 180) }} role="img" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 30, right: 8, bottom: 8, left: 0 }}>
          {<ReferenceArea yAxisId="money" y1={scales.money.domain[0]} y2={0} fill="#fff0f2" fillOpacity={0.7} strokeOpacity={0} />}
          <CartesianGrid strokeDasharray="6 4" stroke="#dfe7e3" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#536a9b' }} tickMargin={10} tickLine={false} axisLine={{ stroke: '#b9c8df' }} interval={monthly ? 0 : 'preserveStartEnd'} />
          <YAxis yAxisId="money" domain={scales.money.domain} ticks={scales.money.ticks} interval={0} width={96} allowDecimals={false} tickFormatter={whole} tick={<MoneyTick />} tickLine={false} axisLine={{ stroke: '#b9c8df' }} label={{ value: 'Amount (GHS)', angle: -90, position: 'insideLeft', fill: '#536a9b', fontSize: 12 }} />
          <YAxis yAxisId="yield" domain={scales.yield.domain} ticks={scales.yield.ticks.filter((_, index) => index % 3 === 0 || index === scales.yield.ticks.length - 1)} interval={0} orientation="right" width={82} allowDecimals={false} tickFormatter={whole} tick={{ fontSize: 12, fill: '#536a9b' }} tickLine={false} axisLine={{ stroke: '#b9c8df' }} label={{ value: 'Yield (tonnes)', angle: -90, position: 'insideRight', fill: '#536a9b', fontSize: 12 }} />
          <Tooltip formatter={(value, name) => name === 'Yield (tonnes)' ? `${whole(value)} tonnes` : formatCurrency(Math.round(Number(value) || 0))} />
          {<ReferenceLine yAxisId="money" y={0} stroke="#a8b8d0" />}
          {metrics.map((metric) => metric.key !== 'yieldTonnes'
            ? <Bar key={metric.key} yAxisId={metric.key === 'yieldTonnes' ? 'yield' : 'money'} dataKey={metric.key} name={metric.name} fill={metric.color} maxBarSize={monthly ? 18 : 38} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey={metric.key} content={<TrendValueLabel color={metric.color} compact={monthly} />} />
              </Bar>
            : <Line key={metric.key} yAxisId="yield" dataKey={metric.key} name={metric.name} stroke={metric.color} strokeWidth={3} dot={{ r: 5, fill: metric.color, stroke: monthly ? '#fff' : metric.color, strokeWidth: monthly ? 1.5 : 0 }} activeDot={{ r: 6 }} isAnimationActive={false} type="linear">
                <LabelList dataKey={metric.key} content={<TrendValueLabel color={metric.color} line />} />
              </Line>)}
        </ComposedChart>
      </ResponsiveContainer>
    </div></div>
    <footer className="farm-trend-summary">
      <TrendingUp className="farm-trend-summary-icon" aria-hidden="true" />
      <div><strong>Overall Trend:</strong><p>{monthly ? summarizeMonthlyTrend(rows) : summarizeYearlyTrend(rows)}</p></div>
      <span className="farm-trend-tagline"><Sprout aria-hidden="true" />{monthly ? <>Healthy Farms<br />Brighter Tomorrows</> : <>Growing Today for a<br />Greener Tomorrow</>}</span>
    </footer>
    {!rows.some((row) => row.records) && <p role="status">No recorded activity for this selection.</p>}
  </article>;
}

export default function FarmPerformanceTrends({ farms, blocks, activities, farmFilter, farmOptions, farmId, blockId, year, onYearChange, blockChart }) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [rangeEnd, setRangeEnd] = useState('auto');
  useEffect(() => {
    const updateYear = () => setCurrentYear(new Date().getFullYear());
    const timer = window.setInterval(updateYear, 60_000);
    window.addEventListener('focus', updateYear);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', updateYear); };
  }, []);
  const scopedActivities = useMemo(() => buildFarmOperationsAnalytics({ farms, blocks, dailyActivities: activities }, { farmId, blockId }).activities, [farms, blocks, activities, farmId, blockId]);
  const trends = useMemo(() => buildFarmPerformanceTrends(scopedActivities, year, currentYear), [scopedActivities, year, currentYear]);
  const scope = farmOptions.find((option) => option.value === farmFilter)?.label || 'Farm A&B';
  const yearlyRows = rangeEnd === 'auto' ? trends.yearly : trends.yearly.filter((row) => Number(row.label) <= Number(rangeEnd));
  return <section className="farm-performance-trends" aria-label="Farm performance trends">
    <AnalyticsChartRotation>
      {blockChart}
      <TrendChart rows={trends.monthly} monthly title={`${year} Monthly Performance Trend (${scope})`} rangeControl={
        <label className="farm-trend-range-control"><CalendarDays aria-hidden="true" /><select className="farm-trend-range" aria-label="Monthly performance year" value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
          {trends.yearly.map((row) => <option key={row.label} value={row.label}>Jan - Dec {row.label}</option>)}
        </select></label>
      } />
      <TrendChart rows={yearlyRows} title={`Yearly Performance Trend (${scope})`} rangeControl={
        <label className="farm-trend-range-control"><CalendarDays aria-hidden="true" /><select className="farm-trend-range" aria-label="Yearly performance range" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)}>
          <option value="auto">2026 - {trends.yearly.at(-1).label}</option>
          {trends.yearly.slice(0, -1).map((row) => <option key={row.label} value={row.label}>2026 - {row.label}</option>)}
        </select></label>
      } />
    </AnalyticsChartRotation>
    {trends.undatedCount > 0 && <p className="farm-trend-note">{trends.undatedCount} records without a valid date are excluded from these time-based charts.</p>}
  </section>;
}
