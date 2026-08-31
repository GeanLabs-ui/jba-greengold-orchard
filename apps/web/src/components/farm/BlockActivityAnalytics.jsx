import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, ClipboardList, TrendingUp } from 'lucide-react';

const number = (value) => Number(value || 0);
const categoryGroup = (category = '') => {
  const value = category.toLowerCase();
  if (value.includes('fertil')) return 'Fertilizer';
  if (value.includes('irrig')) return 'Irrigation';
  if (value.includes('pest') || value.includes('spray') || value.includes('disease')) return 'Pest control';
  if (value.includes('labour') || value.includes('harvest') || value.includes('prun') || value.includes('weed')) return 'Labour';
  return category || 'Other';
};
const monthKey = (value) => String(value || '').slice(0, 7);
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GH', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const colors = ['#398440', '#3478e8', '#f0aa22', '#33a9bb', '#805ad5', '#94a3b8'];

function EmptyChart({ icon: Icon, message }) {
  return <div className="grid h-[150px] place-items-center text-center"><div><Icon className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-[11px] font-medium text-slate-500">{message}</p></div></div>;
}

export default function BlockActivityAnalytics({ activities = [] }) {
  const metrics = useMemo(() => {
    const recentKeys = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(); date.setMonth(date.getMonth() - 11 + index); return date.toISOString().slice(0, 7);
    });
    const byMonth = new Map(recentKeys.map((key) => [key, { month: monthLabel(key), actual: 0, forecast: 0 }]));
    const input = new Map(['Fertilizer', 'Irrigation', 'Pest control', 'Labour'].map((key) => [key, { name: key, planned: 0, completed: 0 }]));
    const categories = new Map();
    activities.forEach((item) => {
      const key = monthKey(item.activity_date); const output = number(item.harvest_quantity ?? item.output_quantity_kg);
      if (byMonth.has(key)) { const point = byMonth.get(key); point.actual += output / 1000; point.forecast += number(item.projected_output_kg ?? item.forecast_yield_kg) / 1000; }
      const group = categoryGroup(item.category); if (input.has(group)) input.get(group)[String(item.status || '').toLowerCase() === 'completed' ? 'completed' : 'planned'] += 1;
      const category = item.category || 'Other'; categories.set(category, (categories.get(category) || 0) + 1);
    });
    return { trend: [...byMonth.values()].map((item) => ({ ...item, actual: Number(item.actual.toFixed(1)), forecast: Number(item.forecast.toFixed(1)) })), input: [...input.values()], categories: [...categories.entries()].map(([name, value]) => ({ name, value })), total: activities.length };
  }, [activities]);

  return <section className="block-activity-analytics mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr_0.8fr]">
    <article className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex items-center justify-between border-b border-emerald-100 px-4 py-3"><h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><TrendingUp className="h-4 w-4 text-emerald-700" />Yield Trend (t)</h2><span className="rounded border px-2 py-1 text-[9px] font-semibold text-slate-500">Last 12 months</span></header>{metrics.trend.some((item) => item.actual || item.forecast) ? <ResponsiveContainer width="100%" height={180}><LineChart data={metrics.trend} margin={{ top: 16, right: 14, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8f0e8" /><XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} /><Line type="monotone" dataKey="actual" name="Actual Yield (t)" stroke="#398440" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="forecast" name="Forecast Yield (t)" stroke="#78b873" strokeDasharray="4 3" strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer> : <EmptyChart icon={TrendingUp} message="No yield from Daily Activity records yet" />}</article>
    <article className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex items-center justify-between border-b border-blue-100 px-4 py-3"><h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><ClipboardList className="h-4 w-4 text-blue-600" />Input / Application Activity</h2><span className="text-[9px] font-semibold text-slate-500">This season</span></header>{activities.length ? <ResponsiveContainer width="100%" height={180}><BarChart data={metrics.input} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e9eff8" /><XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} /><Bar dataKey="planned" name="Planned" fill="#398440" radius={[3, 3, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="#3478e8" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart icon={ClipboardList} message="No application activity yet" />}</article>
    <article className="overflow-hidden rounded-xl border border-cyan-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.025)]"><header className="flex items-center justify-between border-b border-cyan-100 px-4 py-3"><h2 className="text-xs font-bold text-slate-800">Activity Categories</h2><span className="text-[9px] font-semibold text-slate-500">{metrics.total} total</span></header>{metrics.categories.length ? <div className="flex h-[180px] items-center"><ResponsiveContainer width="56%" height="100%"><PieChart><Pie data={metrics.categories} dataKey="value" nameKey="name" innerRadius={34} outerRadius={58} paddingAngle={2}>{metrics.categories.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="min-w-0 space-y-2 pr-3">{metrics.categories.slice(0, 5).map((item, index) => <div key={item.name} className="flex items-center justify-between gap-2 text-[10px]"><span className="flex min-w-0 items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate text-slate-600">{item.name}</span></span><b className="text-slate-700">{item.value}</b></div>)}</div></div> : <EmptyChart icon={BarChart3} message="No activity categories yet" />}</article>
  </section>;
}
