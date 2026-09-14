import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, CalendarDays, ChartNoAxesCombined, Eye,
  House, Banknote, MapPin, ReceiptText, Coins, Plus, Sprout, TrendingUp, Trophy,
} from 'lucide-react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import {
  activityCost,
  activityMatchesBlock,
  activityRevenue,
  activityYieldKg,
  buildFarmOperationsAnalytics,
  parseRecordDate,
} from '@/lib/farm-operations-analytics';

import './farm-operations-analytics.css';

const COST = '#D64545';
const REVENUE = '#16A34A';
const YIELD = '#2563EB';
const COST_COLORS = ['#dc2028', '#ef353e', '#fa535b', '#ff7b80', '#ff9c9f', '#fdd8da'];

const number = (value) => Number(value || 0);
const text = (value) => String(value || '').trim();
const lower = (value) => text(value).toLowerCase();
const recordDate = (row, keys) => keys.map((key) => parseRecordDate(row[key])).find(Boolean) || null;
const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short' });
const formatCedis = (value) => formatCurrency(value);
const compactCurrency = (value) => value >= 1000000 ? `₵${(value / 1000000).toFixed(1)}m` : value >= 1000 ? `₵${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : `₵${formatNumber(value)}`;

function AnalyticsPanel({ title, children, className = '', action }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="text-[#1b5e20] text-section-title">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function SummaryKpi({ icon: Icon, label, value, note, tone = 'green' }) {
  return <div className={`analytics-kpi analytics-kpi--${tone}`}>
    <div className="analytics-kpi-main"><Icon className="analytics-kpi-symbol" /><div><p>{label}</p><strong>{value}</strong></div></div>
    {note ? <p className="analytics-kpi-note"><ArrowDown size={14} />{note}</p> : null}
  </div>;
}

function MergedKpi({ first, second }) {
  return <div className={`analytics-kpi analytics-kpi-merged analytics-kpi--${first.tone}`}>
    {[first, second].map(({ icon: Icon, label, value }) => <div className="analytics-kpi-half" key={label}>
      <span className="analytics-kpi-icon"><Icon size={27} /></span><div><p>{label}</p><strong>{value}</strong></div>
    </div>)}
  </div>;
}

function Sparkline({ tone = 'green', values = [4, 6, 5, 7, 5, 8, 6] }) {
  const color = tone === 'red' ? COST : tone === 'blue' ? YIELD : REVENUE;
  const points = values.map((value, index) => `${index * (92 / (values.length - 1)) + 4},${34 - value * 3.1}`).join(' ');
  return <svg aria-hidden="true" viewBox="0 0 100 40" className="h-10 w-28 overflow-visible"><polyline points={points} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="96" cy={34 - values.at(-1) * 3.1} r="3.2" fill={color} /></svg>;
}

function PerformanceHighlight({ icon: Icon, tone, label, value, detail, gauge }) {
  const colors = {
    red: { surface: 'bg-rose-100/80', icon: 'text-[#d64545]', border: 'border-rose-200/80', value: 'text-[#d64545]' },
    green: { surface: 'bg-[#f4fbf5]', icon: 'text-[#256b2a]', border: 'border-[#e8f5e9]', value: 'text-[#256b2a]' },
    blue: { surface: 'bg-blue-100/80', icon: 'text-[#2563eb]', border: 'border-blue-200/80', value: 'text-[#2563eb]' },
  };
  const palette = colors[tone];
  const gaugeColor = tone === 'blue' ? YIELD : REVENUE;
  return <div className={`analytics-highlight analytics-highlight--${tone} grid min-h-[84px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border ${palette.border} bg-gradient-to-r from-white to-slate-50/70 px-3 py-3`}>
    <span className={`grid h-11 w-11 place-items-center rounded-full ${palette.surface} ${palette.icon}`}><Icon className="h-5 w-5" /></span>
    <div className="min-w-0"><p className="text-caption font-medium text-slate-600">{label}</p><p className={`mt-0.5 text-base font-bold leading-tight ${palette.value}`}>{value}</p><p className="mt-1 text-caption font-medium text-slate-700">{detail}</p></div>
    {gauge != null ? <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: `conic-gradient(${gaugeColor} ${gauge}%, #e5e7eb 0)` }}><span className="grid h-10 w-10 place-items-center rounded-full bg-card text-center text-caption font-bold text-slate-700">{Math.round(gauge)}%</span></span> : <Sparkline tone={tone} />}
  </div>;
}

function StatusPill({ status }) {
  const normalized = lower(status);
  const caution = ['delayed', 'overdue', 'needs attention', 'needs assignment', 'needs configuration', 'requires review'].some((value) => normalized.includes(value));
  const active = ['progress', 'assigned', 'scheduled', 'pending'].some((value) => normalized.includes(value));
  const label = status || 'On Track';
  return <span data-status-tone={caution ? 'caution' : active ? 'active' : 'success'} className={`inline-flex rounded-full px-2.5 py-1 text-caption font-semibold ${caution ? 'bg-amber-100 text-amber-800' : active ? 'bg-blue-100 text-blue-700' : 'bg-[#f4fbf5] text-[#256b2a]'}`}>{label}</span>;
}

function EmptyState({ children = 'No records match this selection.' }) {
  return <div className="grid min-h-40 place-items-center px-5 text-center text-xs text-muted-foreground">{children}</div>;
}

function MetricLegend({ metric = 'all' }) {
  return <div className="analytics-legend" aria-label="Block performance chart legend">
    {[['cost', 'Cost (₵)', COST], ['yield', 'Yield (tonnes)', YIELD], ['revenue', 'Revenue (₵)', REVENUE]].map(([key, label, color]) => <span key={key} style={{ opacity: metric === 'all' || metric === key ? 1 : 0.35 }}><i style={{ background: color, borderRadius: key === 'yield' ? '50%' : 0 }} />{label}</span>)}
  </div>;
}

function BlockPerformanceChart({ rows, height = 280, metric = 'all' }) {
  const showCost = metric === 'all' || metric === 'cost';
  const showRevenue = metric === 'all' || metric === 'revenue';
  const showYield = metric === 'all' || metric === 'yield';
  return <div style={{ height }} className="px-2 py-3">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 12, right: 14, left: 4, bottom: 2 }}>
        <CartesianGrid stroke="#e8f5e9" vertical={false} />
        <XAxis dataKey="blockLabel" tick={{ fontSize: 'var(--text-caption)' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="cost" hide={!showCost && !showRevenue} tickFormatter={compactCurrency} tick={{ fontSize: 'var(--text-caption)' }} axisLine={false} tickLine={false} />

        <YAxis yAxisId="yield" orientation="right" hide={!showYield} tickFormatter={(value) => `${formatNumber(value)}t`} tick={{ fontSize: 'var(--text-caption)' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value, name) => name === 'Yield (tonnes)' ? `${formatNumber(value)} tonnes` : formatCedis(value)} labelFormatter={(label, rowsAtLabel) => `${rowsAtLabel?.[0]?.payload?.farmName || 'Farm'} · ${label}`} />
        {showCost ? <Bar yAxisId="cost" dataKey="cost" name="Cost (₵)" fill={COST} radius={[2, 2, 0, 0]} maxBarSize={30} /> : null}
        {showRevenue ? <Bar yAxisId="cost" dataKey="revenue" name="Revenue (₵)" fill={REVENUE} radius={[2, 2, 0, 0]} maxBarSize={30} /> : null}
        {showYield ? <Line yAxisId="yield" type="linear" dataKey="yieldTonnes" name="Yield (tonnes)" stroke={YIELD} strokeWidth={2} dot={{ r: 3, fill: YIELD, strokeWidth: 0 }} activeDot={{ r: 5 }} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

function BlockPerformanceTable({ rows, metric = 'all', paginate = true }) {
  const [page, setPage] = useState(1);
  const showCost = metric === 'all' || metric === 'cost';
  const showRevenue = metric === 'all' || metric === 'revenue';
  const showYield = metric === 'all' || metric === 'yield';
  const headings = ['Block', ...(showCost ? ['Cost (₵)'] : []), ...(showYield ? ['Yield (tonnes)'] : []), ...(showRevenue ? ['Revenue (₵)'] : []), ...(metric === 'all' ? ['Profit (₵)'] : []), 'Status'];
  const pageSize = 5;
  const rankKeys = metric === 'cost' ? ['cost', 'revenue', 'yieldTonnes'] : metric === 'revenue' ? ['revenue', 'cost', 'yieldTonnes'] : metric === 'yield' ? ['yieldTonnes', 'revenue', 'cost'] : ['revenue', 'cost', 'yieldTonnes'];
  const rankedRows = useMemo(() => rows.slice().sort((left, right) => {
    for (const key of rankKeys) {
      const difference = number(right[key]) - number(left[key]);
      if (difference) return difference;
    }
    return text(left.blockLabel).localeCompare(text(right.blockLabel), undefined, { numeric: true });
  }), [rankKeys, rows]);
  const pageCount = Math.max(1, Math.ceil(rankedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = paginate ? rankedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : rankedRows;

  useEffect(() => setPage(1), [metric, rows]);

  return <div>
    <div className="overflow-x-auto">
      <table className={`analytics-table w-full ${metric === 'all' ? 'min-w-[700px]' : 'min-w-[420px]'} text-caption`}>
        <thead className="border-y border-border bg-muted/30 text-[#1b5e20]"><tr>{headings.map((heading) => <th key={heading} data-metric={heading.startsWith('Cost') ? 'cost' : heading.startsWith('Yield') ? 'yield' : undefined} className="px-4 py-2.5 text-left font-semibold">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{visibleRows.map((row) => <tr key={row.id || `${row.farmName}-${row.blockLabel}`} className="hover:bg-muted/30"><td className="px-4 py-2 font-semibold"><span className={`mr-3 inline-block h-2 w-2 rounded-full ${row.status === 'Needs Attention' ? 'bg-amber-500' : 'bg-[#f5b400]'}`} />{row.blockLabel}</td>{showCost ? <td className="px-4 py-2 font-semibold text-[#d64545]">{formatCedis(row.cost)}</td> : null}{showYield ? <td className="px-4 py-2 font-semibold text-[#2563eb]">{formatNumber(row.yieldTonnes)}</td> : null}{showRevenue ? <td className="px-4 py-2 font-semibold text-[#16a34a]">{formatCedis(row.revenue)}</td> : null}{metric === 'all' ? <td className={`px-4 py-2 font-semibold ${row.margin < 0 ? 'text-[#d64545]' : 'text-emerald-700'}`}>{formatCedis(row.margin)}</td> : null}<td className="px-4 py-2"><StatusPill status={row.status} /></td></tr>)}</tbody>
      </table>
    </div>
    {paginate && rankedRows.length > pageSize ? <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-caption text-muted-foreground"><span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rankedRows.length)} of {rankedRows.length} blocks</span><div className="flex items-center gap-1.5"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="rounded border border-border px-2 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="px-1">Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} className="rounded border border-border px-2 py-1 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></footer> : null}
  </div>;
}

export default function FarmOperationsAnalytics({ data }) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState('all');
  const [farmFilter, setFarmFilter] = useState('all');
  const [metricFilter, setMetricFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isBlockPerformanceOpen, setIsBlockPerformanceOpen] = useState(false);
  const [toolbarTarget, setToolbarTarget] = useState(null);

  useEffect(() => {
    setToolbarTarget(document.getElementById('farm-analytics-header-controls'));
  }, []);

  const farms = data.farms || [];
  const blocks = data.blocks || [];
  const activities = data.dailyActivities || [];

  const range = useMemo(() => {
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(end); start.setHours(0, 0, 0, 0);
    if (period === '30d') start.setDate(start.getDate() - 29);
    if (period === '6m') start.setMonth(start.getMonth() - 5, 1);
    if (period === 'year') start.setMonth(0, 1);
    if (period === 'all') return { start: null, end, label: 'All recorded dates' };
    if (period === 'custom') {
      const customRangeStart = customStart ? new Date(`${customStart}T00:00:00`) : null;
      const customRangeEnd = customEnd ? new Date(`${customEnd}T23:59:59.999`) : null;
      const label = [customStart, customEnd].filter(Boolean).join(' – ') || 'Custom dates';
      return { start: customRangeStart, end: customRangeEnd, label };
    }
    const label = period === '30d'
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${monthLabel(start)}–${monthLabel(end)} ${end.getFullYear()}`;
    return { start, end, label };
  }, [customEnd, customStart, now, period]);

  const { selectedFarmId, selectedBlockId } = useMemo(() => {
    if (farmFilter.startsWith('farm:')) return { selectedFarmId: farmFilter.slice(5), selectedBlockId: 'all' };
    if (farmFilter.startsWith('block:')) return { selectedFarmId: 'all', selectedBlockId: farmFilter.slice(6) };
    return { selectedFarmId: 'all', selectedBlockId: 'all' };
  }, [farmFilter]);

  const farmFilterOptions = useMemo(() => {
    const activeFarms = farms.filter((farm) => !['inactive', 'archived', 'merged'].includes(lower(farm.status))).slice().sort((a, b) => text(a.name).localeCompare(text(b.name)));
    return [{ value: 'all', label: 'All Farms' }, ...activeFarms.flatMap((farm) => {
      const farmBlocks = blocks.filter((block) => String(block.farm_id) === String(farm.id) && !['inactive', 'archived', 'merged'].includes(lower(block.status))).slice().sort((a, b) => text(a.block_code || a.name).localeCompare(text(b.block_code || b.name), undefined, { numeric: true }));
      return [
        { value: `farm:${farm.id}`, label: farm.name },
        ...farmBlocks.map((block) => {
          const code = text(block.block_code || block.name);
          return { value: `block:${block.id}`, label: lower(code).startsWith(lower(farm.name)) ? code : `Farm ${code}` };
        }),
      ];
    })];
  }, [blocks, farms]);

  const analytics = useMemo(() => buildFarmOperationsAnalytics(
    { farms, blocks, dailyActivities: activities },
    { start: range.start, end: range.end, farmId: selectedFarmId, blockId: selectedBlockId },
  ), [activities, blocks, farms, range.end, range.start, selectedBlockId, selectedFarmId]);
  const {
    activities: filteredActivities,
    costRows,
    farmFor,
    farmNameById,
    totalCost,
    totalProjectedCost,
    totalRevenue,
    totalTrees,
    totalYieldKg,
    visibleBlocks,
    visibleFarms,
  } = analytics;

  const blockSummary = visibleBlocks.map((block) => {
    const farmName = block.farm_name || farmNameById.get(String(block.farm_id)) || 'Unassigned farm';
    const blockActivities = filteredActivities.filter((row) => activityMatchesBlock(row, block));
    const cost = blockActivities.reduce((sum, row) => sum + Math.max(0, activityCost(row)), 0);
    const yieldKg = blockActivities.reduce((sum, row) => sum + activityYieldKg(row), 0);
    const revenue = blockActivities.reduce((sum, row) => sum + activityRevenue(row), 0);
    const delayed = blockActivities.some((row) => ['delayed', 'overdue', 'requires review'].includes(lower(row.status)));
    return { ...block, farmName, cost, revenue, margin: revenue - cost, yieldTonnes: yieldKg / 1000, status: delayed ? 'Needs Attention' : 'On Track' };
  });

  const matchesConfiguredBlock = (row) => visibleBlocks.some((block) => activityMatchesBlock(row, block));
  const activityOnlyBlocks = Object.values(filteredActivities.reduce((result, row) => {
    if (matchesConfiguredBlock(row)) return result;
    const label = text(row.block_code || row.block_name || row.block_id);
    if (!label) return result;
    const key = label.toLowerCase();
    result[key] = result[key] || { id: `activity-block-${key}`, block_code: label, name: label, rows: [] };
    result[key].rows.push(row);
    return result;
  }, {}));
  activityOnlyBlocks.forEach((block) => {
    const cost = block.rows.reduce((sum, row) => sum + Math.max(0, activityCost(row)), 0);
    const yieldKg = block.rows.reduce((sum, row) => sum + activityYieldKg(row), 0);
    const revenue = block.rows.reduce((sum, row) => sum + activityRevenue(row), 0);
    const delayed = block.rows.some((row) => ['delayed', 'overdue', 'requires review'].includes(lower(row.status)));
    blockSummary.push({
      ...block,
      farmName: farmFor(block.rows[0]),
      cost,
      revenue,
      margin: revenue - cost,
      yieldTonnes: yieldKg / 1000,
      status: delayed ? 'Needs Attention' : 'Needs Configuration',
      activityOnly: true,
    });
  });

  const blockPerformanceRows = blockSummary.slice().sort((a, b) => (
    a.farmName.localeCompare(b.farmName) || text(a.block_code || a.name).localeCompare(text(b.block_code || b.name), undefined, { numeric: true })
  )).map((block) => ({ ...block, blockLabel: block.block_code || block.name || 'Block' }));
  const costBreakdown = Object.values(costRows.reduce((result, row) => {
    const category = row.costCategory || 'Other';
    result[category] = result[category] || { name: category, value: 0 };
    result[category].value += row.value;
    return result;
  }, {})).sort((a, b) => b.value - a.value);
  const farmCostSplit = Object.values(costRows.reduce((result, row) => {
    const farmName = farmFor(row);
    result[farmName] = result[farmName] || { name: farmName, value: 0 };
    result[farmName].value += row.value;
    return result;
  }, {})).sort((a, b) => b.value - a.value);
  const mostProfitableBlock = blockPerformanceRows.slice().sort((a, b) => b.margin - a.margin)[0];
  const highestYieldBlock = blockPerformanceRows.slice().sort((a, b) => b.yieldTonnes - a.yieldTonnes)[0];
  const lowestCostBlock = blockPerformanceRows.slice().sort((a, b) => a.cost - b.cost)[0];
  const revenueMargin = totalRevenue > 0 ? Math.max(0, ((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  const yearLabel = `Jan–${monthLabel(now)} ${now.getFullYear()}`;
  const recentActivities = filteredActivities.slice().sort((a, b) => (
    (recordDate(b, ['activity_date', 'created_date']) || 0) - (recordDate(a, ['activity_date', 'created_date']) || 0)
  )).slice(0, 6);
  const costBreakdownPanel = <AnalyticsPanel title="Cost Breakdown" className="analytics-cost-breakdown">
    {costBreakdown.length ? <div className="grid min-h-60 items-center gap-4 p-3 sm:grid-cols-[minmax(142px,0.8fr)_minmax(0,1.2fr)]">
      <div className="relative h-48 min-w-[142px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius="53%" outerRadius="90%" paddingAngle={1} stroke="white">{costBreakdown.map((item, index) => <Cell key={item.name} fill={COST_COLORS[index % COST_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCedis(value)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-xs text-[#d64545]">{compactCurrency(totalCost)}</strong><span className="text-caption text-[#d64545]">Total Cost</span></div></div>
      <div className="space-y-2">{costBreakdown.slice(0, 6).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-caption"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COST_COLORS[index % COST_COLORS.length] }} /><span className="min-w-0 flex-1 truncate">{item.name}</span><strong className="text-[#d64545]">{totalCost ? Math.round((item.value / totalCost) * 100) : 0}%</strong><span className="text-[#d64545]">({compactCurrency(item.value)})</span></div>)}</div>
      <div className="border-t border-border pt-3 sm:col-span-2"><p className="mb-3 text-caption font-semibold text-[#d64545]">Cost Split by Main Farm</p><div className="space-y-3">{farmCostSplit.map((farm) => <div key={farm.name} className="flex items-start gap-2 text-caption"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#fff1c7] text-[#d9a800]"><MapPin size={14} /></span><span className="min-w-0 flex-1"><strong className="block truncate">{farm.name}</strong><span className="text-[#d64545]">{compactCurrency(farm.value)} · {totalCost ? Math.round((farm.value / totalCost) * 100) : 0}%</span></span></div>)}</div><div className="mt-4 border-t border-border pt-2 text-caption"><span className="text-[#d64545]">Total Cost</span><strong className="mt-0.5 block text-[#d64545]">{compactCurrency(totalCost)}</strong></div></div>
    </div> : <EmptyState>No costs are logged for {range.label}. New Daily Activity Log entries update this card automatically.</EmptyState>}
  </AnalyticsPanel>;
  const recentActivitiesPanel = <AnalyticsPanel title="Recent Farm Activities" className="analytics-recent" action={<button type="button" onClick={() => navigate('/admin/farm-daily-activities/activities/records')} className="text-caption font-semibold text-[#256b2a] hover:underline">View all activities ›</button>}>
    {recentActivities.length ? <div className="divide-y divide-border">{recentActivities.slice(0, 5).map((row, index) => {
      const activityName = row.title || row.activity_title || row.category || 'Activity';
      const location = [farmFor(row), row.block_name || row.block_code].filter((value) => value && value !== '—').join(' · ') || 'Unassigned farm';
      const assignedTo = row.responsible || row.assigned_workers || row.supervisor_name || 'Not recorded';
      const cost = number(row.actual_cost ?? row.cost);
      return <article key={row.id || row.activity_code || index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
        <div className="min-w-0"><p className="truncate text-caption font-semibold text-slate-800">{activityName}</p><p className="mt-0.5 truncate text-caption text-muted-foreground">{formatDate(row.activity_date || row.created_date)} · {location} · {assignedTo}</p></div>
        <div className="flex shrink-0 items-center gap-3"><StatusPill status={row.status || 'Pending'} /><span className="min-w-14 text-right text-caption font-semibold text-[#d64545]">{cost ? formatCedis(cost) : '—'}</span></div>
      </article>;
    })}</div> : <EmptyState />}
  </AnalyticsPanel>;
  const metricFilterControl = <label className="relative shrink-0 text-label">
    <span className="sr-only">Filter performance metric</span>
    <ChartNoAxesCombined className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
    <select value={metricFilter} onChange={(event) => setMetricFilter(event.target.value)} className="h-7 min-w-28 rounded-md border border-border bg-card pl-6 pr-6 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25">
      <option value="all">All metrics</option><option value="cost">Cost</option><option value="revenue">Revenue</option><option value="yield">Yield</option>
    </select>
  </label>;
  const analyticsToolbar = <div className="analytics-toolbar flex flex-wrap items-center gap-1">
    <label className="relative text-label">
      <span className="sr-only">Analytics date range</span>
      <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
      <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-7 rounded-md border border-border bg-card pl-6 pr-6 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25">
        <option value="30d">Last 30 days</option><option value="6m">Last 6 months</option><option value="year">{yearLabel}</option><option value="all">All dates</option><option value="custom">Custom dates</option>
      </select>
    </label>
    {period === 'custom' ? <div className="flex items-center gap-1"><label className="text-label"><span className="sr-only">Start date</span><input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} className="h-7 rounded-md border border-border bg-card px-2 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25" /></label><span className="text-caption text-muted-foreground">to</span><label className="text-label"><span className="sr-only">End date</span><input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} className="h-7 rounded-md border border-border bg-card px-2 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25" /></label></div> : null}
    <label className="relative text-label">
      <span className="sr-only">Filter by farm</span>
      <House className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
      <select value={farmFilter} onChange={(event) => setFarmFilter(event.target.value)} className="h-7 min-w-28 rounded-md border border-border bg-card pl-6 pr-6 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25">
        {farmFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <Button className="h-7 bg-[#2e7d32] px-2.5 text-caption text-white hover:bg-[#1b5e20]" onClick={() => navigate('/admin/farm-daily-activities/activities/create')}><Plus className="mr-1 h-3 w-3" />Add Activity</Button>
  </div>;
  return (
    <div className="farm-analytics space-y-3 pb-4">
      {toolbarTarget ? createPortal(analyticsToolbar, toolbarTarget) : <section className="flex flex-wrap justify-end gap-2">{analyticsToolbar}</section>}

      <section className="analytics-kpis" aria-label="Farm summary">
        <SummaryKpi icon={MapPin} label="Farm Structure" value={`${visibleFarms.length} farms · ${visibleBlocks.length} blocks`} note={`${formatNumber(totalTrees)} total trees`} tone="gold" />
        <MergedKpi first={{ icon: TrendingUp, label: 'Projected Cost', value: compactCurrency(totalProjectedCost), tone: 'red' }} second={{ icon: ReceiptText, label: 'Actual Cost', value: compactCurrency(totalCost), tone: 'red' }} />
        <MergedKpi first={{ icon: TrendingUp, label: 'Projected Revenue', value: compactCurrency(filteredActivities.reduce((sum, row) => sum + number(row.projected_revenue), 0)), tone: 'revenue' }} second={{ icon: Banknote, label: 'Actual Revenue', value: compactCurrency(totalRevenue), tone: 'revenue' }} />
        <SummaryKpi icon={Sprout} label="Total Yield" value={`${formatNumber(totalYieldKg / 1000)} tonnes`} tone="blue" />
      </section>

      <section aria-label="Block Performance" className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.08fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex flex-wrap items-center gap-3 px-5 pb-1 pt-4">
              <h2 className="shrink-0 text-slate-800 text-section-title">Cost, Revenue &amp; Yield by Block</h2>
              <div className="hidden min-w-0 flex-1 justify-center sm:flex"><MetricLegend metric={metricFilter} /></div>
              <div className="ml-auto">{metricFilterControl}</div>
              <div className="w-full sm:hidden"><MetricLegend metric={metricFilter} /></div>
            </header>
            {blockPerformanceRows.length ? <><BlockPerformanceChart rows={blockPerformanceRows} metric={metricFilter} height={210} /><BlockPerformanceTable rows={blockPerformanceRows} metric={metricFilter} /><div className="border-t border-border px-4 py-2 text-center"><button type="button" onClick={() => setIsBlockPerformanceOpen(true)} className="inline-flex items-center gap-1.5 text-caption font-semibold text-[#256b2a] hover:underline"><Eye className="h-3.5 w-3.5" />View all {blockPerformanceRows.length} blocks</button></div></> : <EmptyState>No blocks match this selection.</EmptyState>}
          </section>
          {recentActivitiesPanel}
        </div>

        <div className="space-y-4">
          <AnalyticsPanel title="Performance Highlights">
            <div className="space-y-3 p-3">
              <PerformanceHighlight icon={Trophy} tone="green" label="Most Profitable Block" value={mostProfitableBlock?.blockLabel || '—'} detail={`Profit: ${formatCedis(mostProfitableBlock?.margin || 0)}`} gauge={totalRevenue ? Math.min(100, Math.max(0, ((mostProfitableBlock?.margin || 0) / totalRevenue) * 100)) : 0} />
              <PerformanceHighlight icon={Sprout} tone="blue" label="Highest Yield" value={highestYieldBlock?.blockLabel || '—'} detail={`${formatNumber(highestYieldBlock?.yieldTonnes || 0)} tonnes`} />
              <PerformanceHighlight icon={Coins} tone="red" label="Lowest Cost" value={lowestCostBlock?.blockLabel || '—'} detail={formatCedis(lowestCostBlock?.cost || 0)} />
              <PerformanceHighlight icon={ChartNoAxesCombined} tone="green" label="Revenue Performance" value={totalRevenue >= totalCost ? 'Strong' : 'Needs attention'} detail={`${formatNumber(revenueMargin)}% margin this period`} gauge={revenueMargin} />
            </div>
          </AnalyticsPanel>
          {costBreakdownPanel}
        </div>
      </section>

      <Dialog open={isBlockPerformanceOpen} onOpenChange={setIsBlockPerformanceOpen}>
        <DialogContent className="farm-analytics max-h-[92vh] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-border px-6 py-5 pr-12">
            <DialogTitle className="text-[#1b5e20]">All Farm Performance</DialogTitle>
            <DialogDescription>Cost, revenue, yield, and margin across every visible farm block.</DialogDescription>
          </DialogHeader>
          {blockPerformanceRows.length ? <div className="space-y-3 p-4"><BlockPerformanceChart rows={blockPerformanceRows} metric={metricFilter} height={340} /><BlockPerformanceTable rows={blockPerformanceRows} metric={metricFilter} paginate={false} /></div> : <EmptyState />}
        </DialogContent>
      </Dialog>

    </div>
  );
}
