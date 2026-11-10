import AnalyticsPie from './AnalyticsPie';
import { aggregateChartPeriods } from '@/lib/analytics-periods';
import { formatChartValue, numericChartAxis } from '@/lib/analytics-chart-scale';
import { activityYieldKg } from '@/lib/farm-operations-analytics';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList, TrendingUp } from 'lucide-react';

const categoryGroup = (category = '') => {
  const value = category.toLowerCase();
  if (value.includes('fertil')) return 'Fertilizer';
  if (value.includes('irrig')) return 'Irrigation';
  if (value.includes('pest') || value.includes('spray') || value.includes('disease')) return 'Pest control';
  if (value.includes('labour') || value.includes('harvest') || value.includes('prun') || value.includes('weed')) return 'Labour';
  return category || 'Other';
};

function EmptyChart({ icon: Icon, message }) {
  return <div className="grid h-[150px] place-items-center text-center"><div><Icon className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-caption font-medium text-slate-500">{message}</p></div></div>;
}

export default function BlockActivityAnalytics({ activities = [] }) {
  const metrics = useMemo(() => {
    const trend = aggregateChartPeriods(activities.map(item => ({
      date: item.activity_date || item.created_date,
      actual: activityYieldKg(item),
      forecast: item.projected_output_kg ?? item.forecast_yield_kg,
    })), 'monthly', ['actual', 'forecast']);
    const input = new Map(['Fertilizer', 'Irrigation', 'Pest control', 'Labour'].map((key) => [key, { name: key, planned: 0, completed: 0 }]));
    const categories = new Map();
    activities.forEach((item) => {
      const group = categoryGroup(item.category); if (input.has(group)) input.get(group)[String(item.status || '').toLowerCase() === 'completed' ? 'completed' : 'planned'] += 1;
      const category = item.category || 'Other'; categories.set(category, (categories.get(category) || 0) + 1);
    });
    return { trend, input: [...input.values()], categories: [...categories.entries()].map(([name, value]) => ({ name, value })), total: activities.length };
  }, [activities]);

  return <section className="block-activity-analytics mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr_0.8fr]">
    <article className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 px-4 py-3"><h2 className="flex items-center gap-2 text-slate-800 text-section-title"><TrendingUp className="h-4 w-4 text-emerald-700" /><span className="card-heading-text">Yield Trend (Kg)</span></h2><span className="rounded border px-2 py-1 text-caption font-semibold text-slate-500">Selected period</span></header>{metrics.trend.some((item) => item.actual != null || item.forecast != null) ? <ResponsiveContainer width="100%" height={180}><LineChart data={metrics.trend} margin={{ top: 16, right: 14, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#f4fbf5" /><XAxis dataKey="label" interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 'var(--text-caption)', fill: '#3b7a57' }} tickLine={false} axisLine={false} /><YAxis allowDataOverflow {...numericChartAxis(metrics.trend, ['actual', 'forecast'])} allowDecimals={false} tickFormatter={(value) => formatChartValue(value, '', { compact: true })} tick={{ fontSize: 'var(--text-caption)', fill: '#3b7a57' }} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatChartValue(value, 'kg')} /><Legend iconSize={8} wrapperStyle={{ fontSize: 'var(--text-caption)' }} /><Line type="monotone" dataKey="actual" name="Actual Yield (Kg)" stroke="#2e7d32" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="forecast" name="Forecast Yield (Kg)" stroke="#a5d6a7" strokeDasharray="4 3" strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer> : <EmptyChart icon={TrendingUp} message="No yield from Daily Activity records yet" />}</article>
    <article className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 px-4 py-3"><h2 className="flex items-center gap-2 text-slate-800 text-section-title"><ClipboardList className="h-4 w-4 text-blue-600" /><span className="card-heading-text">Input / Application Activity</span></h2><span className="text-caption font-semibold text-slate-500">This season</span></header>{metrics.input.some(row => row.planned || row.completed) ? <ResponsiveContainer width="100%" height={180}><BarChart data={metrics.input} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#f4fbf5" /><XAxis dataKey="name" tick={{ fontSize: 'var(--text-caption)', fill: '#3b7a57' }} tickLine={false} axisLine={false} /><YAxis allowDataOverflow {...numericChartAxis(metrics.input, ['planned', 'completed'])} allowDecimals={false} tick={{ fontSize: 'var(--text-caption)', fill: '#3b7a57' }} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => Math.round(Number(value)).toLocaleString()} /><Legend iconSize={8} wrapperStyle={{ fontSize: 'var(--text-caption)' }} /><Bar dataKey="planned" name="Planned" fill="#2e7d32" radius={[3, 3, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="#3b7a57" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart icon={ClipboardList} message="No application activity yet" />}</article>
    <article className="overflow-hidden rounded-xl border border-cyan-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-100 px-4 py-3"><h2 className="text-slate-800 text-section-title">Activity Categories</h2><span className="text-caption font-semibold text-slate-500">{metrics.total} total</span></header><div className="p-3"><AnalyticsPie rows={metrics.categories} unit="records" title="Activity categories" emptyMessage="No activity categories yet." /></div></article>
  </section>;
}
