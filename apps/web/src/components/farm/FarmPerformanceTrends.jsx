import AnalyticsChartRotation from './AnalyticsChartRotation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChartNoAxesColumnIncreasing, TrendingUp, Sprout } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatChartValue, nonNegativeChartRows, numericChartAxis } from '@/lib/analytics-chart-scale';
import { reportingMonths } from '@/lib/analytics-periods';
import { buildFarmOperationsAnalytics } from '@/lib/farm-operations-analytics';
import { buildFarmPerformanceTrends, summarizeYearlyTrend, summarizeMonthlyTrend } from '@/lib/farm-performance-trends';
import './farm-performance-trends.css';

const METRICS = [
  { key: 'cost', name: 'Cost (GHS)', color: '#ff304b' },
  { key: 'revenue', name: 'Revenue (GHS)', color: '#24a657' },
  { key: 'profit', name: 'Profit (GHS)', color: '#ffb800' },
  { key: 'yieldKg', name: 'Yield (Kg)', color: '#1673ff' },
];
function TrendChart({ rows, monthly, title, rangeControl, compact = false }) {
  const hasRecords = rows.some((row) => row.records);
  const plotRows = nonNegativeChartRows(rows, METRICS.map(({ key }) => key));
  const moneyAxis = numericChartAxis(plotRows, ['cost', 'revenue', 'profit'], { compressOutliers: true });
  const yieldAxis = numericChartAxis(plotRows, ['yieldKg'], { compressOutliers: true });
  const metrics = METRICS;
  return <article className={`farm-trend-card ${monthly ? 'farm-trend-card--monthly' : 'farm-trend-card--yearly'}`}>
    <div className="farm-trend-heading">
      <ChartNoAxesColumnIncreasing className="farm-trend-icon" aria-hidden="true" />
      <div><h3>{title}</h3>
      {monthly && <p>Cost, yield, revenue and profit by reporting month</p>}</div>
      {rangeControl}
    </div>
    <div className="farm-trend-legend">{metrics.map((metric) => <span key={metric.key}><i style={{ background: metric.color }} />{metric.name}</span>)}</div>
    {hasRecords ? <div className="analytics-plot-scroll"><div className="farm-trend-plot min-w-0" style={{ minWidth: 0 }} role="img" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart accessibilityLayer data={plotRows} margin={{ top: 16, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#dfe7e3" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#536a9b' }} tickMargin={10} tickLine={false} axisLine={{ stroke: '#b9c8df' }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis allowDataOverflow yAxisId="money" {...moneyAxis} width={compact ? 72 : 96} tickFormatter={(value) => formatChartValue(value, '', { compact: true })} tick={{ fontSize: 12, fill: '#536a9b' }} tickLine={false} axisLine={{ stroke: '#b9c8df' }} label={{ value: 'Amount (GHS)', angle: -90, position: 'insideLeft', fill: '#536a9b', fontSize: 12 }} />
          <YAxis allowDataOverflow yAxisId="yield" {...yieldAxis} orientation="right" width={compact ? 66 : 82} tickFormatter={(value) => formatChartValue(value, '', { compact: true })} tick={{ fontSize: 12, fill: '#536a9b' }} tickLine={false} axisLine={{ stroke: '#b9c8df' }} label={{ value: 'Yield (Kg)', angle: -90, position: 'insideRight', fill: '#536a9b', fontSize: 12 }} />
          <Tooltip formatter={(value, name) => formatChartValue(value, name === 'Yield (Kg)' ? 'kg' : 'GHS')} />
          {<ReferenceLine yAxisId="money" y={0} stroke="#a8b8d0" />}
          {metrics.map((metric) => metric.key !== 'yieldKg'
            ? <Bar key={metric.key} yAxisId={metric.key === 'yieldKg' ? 'yield' : 'money'} dataKey={metric.key} name={metric.name} fill={metric.color} maxBarSize={monthly ? 18 : 38} radius={2} isAnimationActive={false}>
              </Bar>
            : <Line key={metric.key} yAxisId="yield" dataKey={metric.key} name={metric.name} stroke={metric.color} strokeWidth={3} dot={{ r: 5, fill: metric.color, stroke: monthly ? '#fff' : metric.color, strokeWidth: monthly ? 1.5 : 0 }} activeDot={{ r: 6 }} isAnimationActive={false} type="linear">
              </Line>)}
        </ComposedChart>
      </ResponsiveContainer>
    </div></div> : <p className="grid min-h-64 place-items-center text-center" role="status">No recorded activity for this selection.</p>}
    {(moneyAxis.scale || yieldAxis.scale) && <p className="text-caption text-muted-foreground">Logarithmic spacing near outliers on the {moneyAxis.scale && yieldAxis.scale ? 'GHS and yield axes' : moneyAxis.scale ? 'GHS axis' : 'yield axis'}. Hover or focus the chart for exact values.</p>}
    {rows.some(row => METRICS.some(({ key }) => row[key] < 0)) && <p className="text-caption text-muted-foreground">Negative results are plotted at zero.</p>}
    <footer className="farm-trend-summary">
      <TrendingUp className="farm-trend-summary-icon" aria-hidden="true" />
      <div><strong>Overall Trend:</strong><p>{monthly ? summarizeMonthlyTrend(rows) : summarizeYearlyTrend(rows)}</p></div>
      <span className="farm-trend-tagline"><Sprout aria-hidden="true" />{monthly ? <>Healthy Farms<br />Brighter Tomorrows</> : <>Growing Today for a<br />Greener Tomorrow</>}</span>
    </footer>
  </article>;
}

function MonthlyTrendChart({ rows, scope, year, years, onYearChange, compact }) {
  return <TrendChart rows={rows} monthly compact={compact} title={`${year} Monthly Performance Trend (${scope})`} rangeControl={
    <label className="farm-trend-range-control"><CalendarDays aria-hidden="true" /><select className="farm-trend-range" aria-label="Monthly performance year" value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
      {years.map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
  } />;
}

export default function FarmPerformanceTrends({ farms, blocks, activities, farmFilter, farmOptions, farmId, blockId, year, onYearChange, blockChart, profileScope }) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [rangeEnd, setRangeEnd] = useState('auto');
  useEffect(() => {
    const updatePeriod = () => {
      const now = new Date();
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth() + 1);
    };
    const timer = window.setInterval(updatePeriod, 60_000);
    window.addEventListener('focus', updatePeriod);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', updatePeriod); };
  }, []);
  const scopedActivities = useMemo(() => profileScope ? activities : buildFarmOperationsAnalytics({ farms, blocks, dailyActivities: activities }, { farmId, blockId }).activities, [farms, blocks, activities, farmId, blockId, profileScope]);
  const selectedYear = year ?? currentYear;
  const trends = useMemo(() => buildFarmPerformanceTrends(scopedActivities, selectedYear, currentYear), [scopedActivities, selectedYear, currentYear]);
  const monthlyRows = reportingMonths(trends.monthly, selectedYear, currentYear, currentMonth, row => row.records > 0);
  const scope = profileScope || farmOptions.find((option) => option.value === farmFilter)?.label || 'Farm A&B';
  const yearlyRange = trends.yearly.slice(0, -1).some(row => row.label === rangeEnd) ? rangeEnd : 'auto';
  const yearlyRows = yearlyRange === 'auto' ? trends.yearly : trends.yearly.filter((row) => Number(row.label) <= Number(yearlyRange));
  return <section className={profileScope ? "farm-profile-performance farm-performance-trends" : "farm-performance-trends"} aria-label="Farm performance trends">
    <AnalyticsChartRotation>
      {blockChart}
      <MonthlyTrendChart rows={monthlyRows} scope={scope} year={selectedYear} years={trends.yearly.map((row) => row.label)} onYearChange={onYearChange} compact={Boolean(profileScope)} />
      <TrendChart rows={yearlyRows} compact={Boolean(profileScope)} title={`Yearly Performance Trend (${scope})`} rangeControl={
        <label className="farm-trend-range-control"><CalendarDays aria-hidden="true" /><select className="farm-trend-range" aria-label="Yearly performance range" value={yearlyRange} onChange={(event) => setRangeEnd(event.target.value)}>
          <option value="auto">All available years</option>
          {trends.yearly.slice(0, -1).map((row) => <option key={row.label} value={row.label}>Through {row.label}</option>)}
        </select></label>
      } />
    </AnalyticsChartRotation>
    {trends.undatedCount > 0 && <p className="farm-trend-note">{trends.undatedCount} records without a valid date are excluded from these time-based charts.</p>}
  </section>;
}
