import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, CalendarDays, CircleDollarSign, ClipboardList,
  House, Leaf, Plus, Trees, TrendingUp,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatNumber } from '@/components/shared/format';
import {
  activityRevenue,
  activityYieldKg,
  buildFarmOperationsAnalytics,
  parseRecordDate,
} from '@/lib/farm-operations-analytics';

const GREEN = '#176b2c';
const LIGHT_GREEN = '#70bd48';
const BLUE = '#2f88d8';
const LIGHT_BLUE = '#83baf0';
const COST_COLORS = ['#176b2c', '#4ba43e', '#82c45c', '#e0aa16', '#6a9f68', '#acd38c'];

const number = (value) => Number(value || 0);
const text = (value) => String(value || '').trim();
const lower = (value) => text(value).toLowerCase();
const recordDate = (row, keys) => keys.map((key) => parseRecordDate(row[key])).find(Boolean) || null;
const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short' });
const compactCurrency = (value) => value >= 1000000 ? `GHS ${(value / 1000000).toFixed(1)}m` : value >= 1000 ? `GHS ${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : `GHS ${formatNumber(value)}`;

function AnalyticsPanel({ title, children, className = '', action }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-[#145b29]">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Kpi({ icon: Icon, label, value, note, tone = 'green', inverse = false }) {
  const blue = tone === 'blue';
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${blue ? 'bg-blue-100 text-blue-700' : 'bg-[#e8f4e3] text-[#176b2c]'}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-foreground">{value}</p>
        </div>
      </div>
      <p className={`mt-3 flex items-center gap-1 text-[10px] ${inverse ? 'text-rose-600' : 'text-emerald-700'}`}>
        {inverse ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{note}
      </p>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = lower(status);
  const caution = ['delayed', 'overdue', 'needs attention', 'needs assignment', 'needs configuration', 'requires review'].some((value) => normalized.includes(value));
  const active = ['progress', 'assigned', 'scheduled', 'pending'].some((value) => normalized.includes(value));
  const label = status || 'On Track';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${caution ? 'bg-amber-100 text-amber-800' : active ? 'bg-blue-100 text-blue-700' : 'bg-[#e6f3df] text-[#176b2c]'}`}>{label}</span>;
}

function EmptyState({ children = 'No records match this selection.' }) {
  return <div className="grid min-h-40 place-items-center px-5 text-center text-xs text-muted-foreground">{children}</div>;
}

export default function FarmOperationsAnalytics({ data }) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState('all');
  const [farmFilter, setFarmFilter] = useState('all');

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
    const label = period === '30d'
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${monthLabel(start)}–${monthLabel(end)} ${end.getFullYear()}`;
    return { start, end, label };
  }, [now, period]);

  const analytics = useMemo(() => buildFarmOperationsAnalytics(
    { farms, blocks, dailyActivities: activities },
    { start: range.start, end: range.end, farmId: farmFilter },
  ), [activities, blocks, farmFilter, farms, range.end, range.start]);
  const {
    activities: filteredActivities,
    activeTasks,
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

  const farmSummary = visibleFarms.map((farm, index) => {
    const farmName = farm.name || `Farm ${index + 1}`;
    const farmBlocks = visibleBlocks.filter((block) => String(block.farm_id) === String(farm.id) || block.farm_name === farmName);
    const farmCosts = costRows.filter((row) => farmFor(row) === farmName || String(row.farm_id) === String(farm.id)).reduce((sum, row) => sum + row.value, 0);
    const farmActivities = filteredActivities.filter((row) => farmFor(row) === farmName || String(row.farm_id) === String(farm.id));
    const farmYield = farmActivities.reduce((sum, row) => sum + activityYieldKg(row), 0);
    const revenue = farmActivities.reduce((sum, row) => sum + activityRevenue(row), 0);
    return {
      ...farm, farmName, shortName: farm.farm_code || String.fromCharCode(65 + index), blocks: farmBlocks.length,
      cost: farmCosts, yieldTonnes: farmYield / 1000, costPerTonne: farmYield ? farmCosts / (farmYield / 1000) : 0,
      revenue, margin: revenue - farmCosts, status: farmCosts > revenue ? 'Needs Attention' : 'On Track',
    };
  });

  const unassignedActivities = filteredActivities.filter((row) => farmFor(row) === 'Unassigned farm');
  const unassignedCosts = costRows.filter((row) => farmFor(row) === 'Unassigned farm').reduce((sum, row) => sum + row.value, 0);
  const unassignedYield = unassignedActivities.reduce((sum, row) => sum + activityYieldKg(row), 0);
  const unassignedRevenue = unassignedActivities.reduce((sum, row) => sum + activityRevenue(row), 0);
  if (unassignedActivities.length) {
    farmSummary.push({
      id: 'unassigned-farm', farmName: 'Unassigned farm', shortName: 'U', blocks: 0,
      cost: unassignedCosts, yieldTonnes: unassignedYield / 1000,
      costPerTonne: unassignedYield ? unassignedCosts / (unassignedYield / 1000) : 0,
      revenue: unassignedRevenue, margin: unassignedRevenue - unassignedCosts,
      status: 'Needs Assignment',
    });
  }

  const blockSummary = visibleBlocks.map((block) => {
    const farmName = block.farm_name || farmNameById.get(String(block.farm_id)) || 'Unassigned farm';
    const isRow = (row) => String(row.block_id) === String(block.id) || row.block_name === block.name || row.block_code === block.block_code;
    const cost = costRows.filter(isRow).reduce((sum, row) => sum + row.value, 0);
    const yieldKg = filteredActivities.filter(isRow).reduce((sum, row) => sum + activityYieldKg(row), 0);
    const delayed = filteredActivities.some((row) => isRow(row) && ['delayed', 'overdue', 'requires review'].includes(lower(row.status)));
    return { ...block, farmName, cost, yieldTonnes: yieldKg / 1000, status: delayed ? 'Needs Attention' : 'On Track' };
  });

  const matchesConfiguredBlock = (row) => visibleBlocks.some((block) => (
    String(row.block_id) === String(block.id)
    || (row.block_name && row.block_name === block.name)
    || (row.block_code && row.block_code === block.block_code)
  ));
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
    const rowIds = new Set(block.rows.map((row) => row.id));
    const cost = costRows.filter((row) => rowIds.has(row.id)).reduce((sum, row) => sum + row.value, 0);
    const yieldKg = block.rows.reduce((sum, row) => sum + activityYieldKg(row), 0);
    const delayed = block.rows.some((row) => ['delayed', 'overdue', 'requires review'].includes(lower(row.status)));
    blockSummary.push({
      ...block,
      farmName: farmFor(block.rows[0]),
      cost,
      yieldTonnes: yieldKg / 1000,
      status: delayed ? 'Needs Attention' : 'Needs Configuration',
      activityOnly: true,
    });
  });

  const contribution = blockSummary.slice().sort((a, b) => b.cost - a.cost || b.yieldTonnes - a.yieldTonnes).slice(0, 10);
  const maxBlockCost = Math.max(...contribution.map((row) => row.cost), 1);
  const maxBlockYield = Math.max(...contribution.map((row) => row.yieldTonnes), 1);
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

  const selectedFarmLabel = farmFilter === 'all' ? 'All Farms' : farmNameById.get(farmFilter) || 'Selected Farm';
  const yearLabel = `Jan–${monthLabel(now)} ${now.getFullYear()}`;
  const recentActivities = filteredActivities.slice().sort((a, b) => (recordDate(b, ['activity_date', 'created_date']) || 0) - (recordDate(a, ['activity_date', 'created_date']) || 0)).slice(0, 6);

  return (
    <div className="space-y-3 pb-4">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#155f2a]">Farm Operations Analytics</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Performance overview across {selectedFarmLabel.toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Analytics date range</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#176b2c]" />
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10 rounded-lg border border-border bg-card pl-9 pr-8 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/25">
              <option value="30d">Last 30 days</option><option value="6m">Last 6 months</option><option value="year">{yearLabel}</option><option value="all">All dates</option>
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Filter by farm</span>
            <House className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#176b2c]" />
            <select value={farmFilter} onChange={(event) => setFarmFilter(event.target.value)} className="h-10 min-w-36 rounded-lg border border-border bg-card pl-9 pr-8 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/25">
              <option value="all">All Farms</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>
          </label>
          <Button className="h-10 bg-[#1f7a2e] text-white hover:bg-[#176426]" onClick={() => navigate('/admin/farm-daily-activities/activities/create')}><Plus className="mr-2 h-4 w-4" />Add Activity</Button>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={Trees} label="Farm Structure" value={`${visibleFarms.length} farms · ${visibleBlocks.length} blocks`} note={`${formatNumber(totalTrees)} total trees`} />
        <Kpi icon={CircleDollarSign} label="Projected Cost" value={compactCurrency(totalProjectedCost)} note="Planned cost from daily logs" />
        <Kpi icon={CircleDollarSign} label="Actual Cost" value={compactCurrency(totalCost)} note="Recorded operating cost" />
        <Kpi icon={Leaf} label="Total Yield" value={`${formatNumber(totalYieldKg / 1000)} tonnes`} note="Harvested in this period" />
        <Kpi icon={TrendingUp} label="Total Revenue" value={compactCurrency(totalRevenue)} note="Revenue from daily activity logs" />
        <Kpi icon={ClipboardList} label="Active Tasks" value={activeTasks} note="Open farm activities" tone="blue" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <AnalyticsPanel title="Main Farm Cost vs Yield">
          {farmSummary.length ? <div className="h-56 px-2 py-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={farmSummary} margin={{ top: 16, right: 16, left: 4, bottom: 2 }}><CartesianGrid stroke="#e9eee9" vertical={false} /><XAxis dataKey="farmName" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="cost" tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}K` : value} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis yAxisId="yield" orientation="right" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value, name) => name === 'Total cost' ? formatCurrency(value) : `${formatNumber(value)} tonnes`} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar yAxisId="cost" dataKey="cost" name="Total cost" fill={GREEN} radius={[2, 2, 0, 0]} maxBarSize={48} /><Bar yAxisId="yield" dataKey="yieldTonnes" name="Total yield" fill={BLUE} radius={[2, 2, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer></div> : <EmptyState />}
        </AnalyticsPanel>

        <AnalyticsPanel title="Block Contribution">
          {contribution.length ? <div className="grid gap-5 p-4 sm:grid-cols-2">
            <div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium"><span className="h-2 w-2 bg-[#176b2c]" />Cost Contribution (GHS)</div><div className="space-y-2">{contribution.map((row, index) => <div key={`cost-${row.id || row.block_code}-${index}`} className="grid grid-cols-[28px_1fr_58px] items-center gap-2 text-[10px]"><span className="font-medium">{row.block_code || row.name}</span><span className="h-2.5 bg-muted"><span className="block h-full" style={{ width: `${(row.cost / maxBlockCost) * 100}%`, backgroundColor: index < 5 ? LIGHT_GREEN : '#76b7c7' }} /></span><span>{formatNumber(row.cost)}</span></div>)}</div></div>
            <div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium"><span className="h-2 w-2 bg-[#2f88d8]" />Yield Contribution (tonnes)</div><div className="space-y-2">{contribution.map((row, index) => <div key={`yield-${row.id || row.block_code}-${index}`} className="grid grid-cols-[28px_1fr_34px] items-center gap-2 text-[10px]"><span className="font-medium">{row.block_code || row.name}</span><span className="h-2.5 bg-muted"><span className="block h-full" style={{ width: `${(row.yieldTonnes / maxBlockYield) * 100}%`, backgroundColor: index < 5 ? BLUE : LIGHT_BLUE }} /></span><span>{formatNumber(row.yieldTonnes)}</span></div>)}</div></div>
          </div> : <EmptyState />}
        </AnalyticsPanel>
      </section>

      <AnalyticsPanel title="Main Farm Summary">
        {farmSummary.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-[10px]"><thead className="border-b border-border text-[#155f2a]"><tr>{['Main Farm', 'Blocks', 'Total Cost (GHS)', 'Total Yield (tonnes)', 'Cost per Tonne (GHS)', 'Revenue (GHS)', 'Margin (GHS)', 'Status'].map((heading) => <th key={heading} className="px-4 py-2 text-left font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{farmSummary.map((farm, index) => <tr key={farm.id || farm.farmName} className="hover:bg-muted/30"><td className="px-4 py-2"><span className={`mr-2 inline-grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white ${index % 2 ? 'bg-blue-500' : 'bg-green-700'}`}>{farm.shortName?.slice(0, 1)}</span><strong>{farm.farmName}</strong></td><td className="px-4 py-2">{farm.blocks}</td><td className="px-4 py-2">{formatNumber(farm.cost)}</td><td className="px-4 py-2">{formatNumber(farm.yieldTonnes)}</td><td className="px-4 py-2">{formatNumber(farm.costPerTonne)}</td><td className="px-4 py-2">{formatNumber(farm.revenue)}</td><td className="px-4 py-2">{formatNumber(farm.margin)}</td><td className="px-4 py-2"><StatusPill status={farm.status} /></td></tr>)}</tbody></table></div> : <EmptyState />}
      </AnalyticsPanel>

      <AnalyticsPanel title="Block Performance">
        {farmSummary.length ? <div className="grid gap-4 p-3 lg:grid-cols-2">{farmSummary.slice(0, 2).map((farm, farmIndex) => {
          const rows = blockSummary.filter((block) => block.farmName === farm.farmName);
          return <div key={farm.id || farm.farmName} className="overflow-hidden rounded-lg border border-border"><div className={`flex items-center gap-3 px-4 py-2.5 ${farmIndex % 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}><House className="h-5 w-5" /><span><strong className="block text-xs">{farm.farmName}</strong><span className="block text-[10px]">{rows.length} Blocks</span></span></div>{rows.length ? <table className="w-full text-[9px]"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-3 py-1.5 text-left">Block</th><th className="px-3 py-1.5 text-right">Cost (GHS)</th><th className="px-3 py-1.5 text-right">Yield (tonnes)</th><th className="px-3 py-1.5 text-right">Status</th></tr></thead><tbody>{rows.slice(0, 7).map((row) => <tr key={row.id || row.block_code} className="border-b border-border/60 last:border-0"><td className="px-3 py-1 font-medium">{row.block_code || row.name}</td><td className="px-3 py-1 text-right">{formatNumber(row.cost)}</td><td className="px-3 py-1 text-right">{formatNumber(row.yieldTonnes)}</td><td className="px-3 py-1 text-right"><StatusPill status={row.status} /></td></tr>)}</tbody></table> : <EmptyState>No blocks are assigned to this farm.</EmptyState>}</div>;
        })}</div> : <EmptyState />}
      </AnalyticsPanel>

      <section className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
        <AnalyticsPanel title="Cost Breakdown">
          {costBreakdown.length ? <div className="grid min-h-60 items-center gap-3 p-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-[0.8fr_1.05fr_0.8fr]">
            <div className="relative h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={1} stroke="white">{costBreakdown.map((item, index) => <Cell key={item.name} fill={COST_COLORS[index % COST_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-xs">{compactCurrency(totalCost)}</strong><span className="text-[9px] text-muted-foreground">Total Cost</span></div></div>
            <div className="space-y-2">{costBreakdown.slice(0, 6).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-[10px]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COST_COLORS[index % COST_COLORS.length] }} /><span className="min-w-0 flex-1 truncate">{item.name}</span><strong>{totalCost ? Math.round((item.value / totalCost) * 100) : 0}%</strong><span className="text-muted-foreground">({compactCurrency(item.value)})</span></div>)}</div>
            <div className="border-t border-border pt-3 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0"><p className="mb-3 text-[10px] font-semibold text-[#155f2a]">Cost Split by Main Farm</p><div className="space-y-3">{farmCostSplit.map((farm, index) => <div key={farm.name} className="flex items-start gap-2 text-[10px]"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ${index % 2 ? 'bg-blue-500' : 'bg-green-700'}`}>{farm.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate">{farm.name}</strong><span className="text-muted-foreground">{compactCurrency(farm.value)} · {totalCost ? Math.round((farm.value / totalCost) * 100) : 0}%</span></span></div>)}</div><div className="mt-4 border-t border-border pt-2 text-[10px]"><span className="text-muted-foreground">Total Cost</span><strong className="mt-0.5 block">{compactCurrency(totalCost)}</strong></div></div>
          </div> : <EmptyState>No costs are logged for {range.label}. New Daily Activity Log entries update this card automatically.</EmptyState>}
        </AnalyticsPanel>

        <AnalyticsPanel title="Recent Farm Activities" action={<button type="button" onClick={() => navigate('/admin/farm-daily-activities/activities/records')} className="text-[10px] font-semibold text-[#176b2c] hover:underline">View all activities ›</button>}>
          {recentActivities.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[9px]"><thead className="border-b border-border text-[#155f2a]"><tr>{['Date', 'Activity', 'Farm Block', 'Main Farm', 'Assigned To', 'Status', 'Cost (GHS)'].map((heading) => <th key={heading} className="px-3 py-2 text-left font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{recentActivities.map((row, index) => <tr key={row.id || row.activity_code || index} className="hover:bg-muted/30"><td className="px-3 py-2">{formatDate(row.activity_date || row.created_date)}</td><td className="max-w-48 truncate px-3 py-2 font-medium">{row.title || row.activity_title || row.category || 'Activity'}</td><td className="px-3 py-2">{row.block_name || row.block_code || '—'}</td><td className="px-3 py-2">{farmFor(row)}</td><td className="px-3 py-2">{row.responsible || row.assigned_workers || row.supervisor_name || 'Not recorded'}</td><td className="px-3 py-2"><StatusPill status={row.status || 'Pending'} /></td><td className="px-3 py-2 text-right">{number(row.actual_cost ?? row.cost) ? formatNumber(row.actual_cost ?? row.cost) : '—'}</td></tr>)}</tbody></table></div> : <EmptyState />}
        </AnalyticsPanel>
      </section>
    </div>
  );
}
