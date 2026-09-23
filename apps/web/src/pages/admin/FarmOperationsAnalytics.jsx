import FarmPerformanceTrends from '@/components/farm/FarmPerformanceTrends';
import CostBreakdown from '@/components/farm/CostBreakdown';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown, CalendarDays, ChartNoAxesCombined, Pencil,
  House, Banknote, MapPin, ReceiptText, Coins, Plus, Sprout, TrendingUp, Trophy,
} from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/components/shared/format';
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
const PROJECTIONS = {
  cost: { label: 'Projected Cost', unit: '₵', defaultValue: 60000 },
  revenue: { label: 'Projected Revenue', unit: '₵', defaultValue: 400000 },
  yield: { label: 'Projected Yield', unit: 'tonnes', defaultValue: 10000 },
};

const number = (value) => Number(value || 0);
const text = (value) => String(value || '').trim();
const lower = (value) => text(value).toLowerCase();
const recordDate = (row, keys) => keys.map((key) => parseRecordDate(row[key])).find(Boolean) || null;
const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short' });
const formatCedis = (value) => formatCurrency(value);
const wholeNumber = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

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
    {[first, second].map(({ icon: Icon, label, value, remaining, onClick }) => {
      const Tag = onClick ? 'button' : 'div';
      return <Tag className="analytics-kpi-half" key={label} {...(onClick ? { type: 'button', onClick, 'aria-label': `Edit ${label}` } : {})}>
        <span className="analytics-kpi-icon"><Icon size={22} /></span><div><p>{label}{onClick ? <Pencil size={11} className="ml-1 inline-block" /> : null}</p><strong>{value}</strong>{remaining != null ? <span className="analytics-kpi-remaining">{remaining}</span> : null}</div>
      </Tag>;
    })}
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

export default function FarmOperationsAnalytics({ data }) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState('all');
  const [farmFilter, setFarmFilter] = useState('all');
  const [blockMetric, setBlockMetric] = useState('all');
  const [trendYear, setTrendYear] = useState(() => new Date().getFullYear());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [toolbarTarget, setToolbarTarget] = useState(null);
  const [projections, setProjections] = useState(null);
  const [projectionError, setProjectionError] = useState('');
  const [editingProjection, setEditingProjection] = useState(null);
  const [projectionDraft, setProjectionDraft] = useState('');
  const [savingProjection, setSavingProjection] = useState(false);
  const [projectionFeedback, setProjectionFeedback] = useState('');

  useEffect(() => {
    let active = true;
    base44.entities.FarmAnalyticsProjection.list('-created_date', 1)
      .then((rows) => { if (active) setProjections(rows[0] || {}); })
      .catch((error) => { if (active) setProjectionError(error.message || 'Could not load projections. Refresh to retry.'); });
    return () => { active = false; };
  }, []);

  const projectionValue = (key) => projections?.[key] ?? PROJECTIONS[key].defaultValue;
  const openProjection = (key) => {
    setEditingProjection(key);
    setProjectionDraft(String(projectionValue(key)));
    setProjectionFeedback('');
  };
  const saveProjection = async (event) => {
    event.preventDefault();
    const value = Number(projectionDraft);
    if (!projectionDraft.trim() || !Number.isFinite(value) || value < 0) {
      setProjectionFeedback('Enter a valid number of zero or greater.');
      return;
    }
    setSavingProjection(true);
    setProjectionFeedback('');
    try {
      const latest = (await base44.entities.FarmAnalyticsProjection.list('-created_date', 1))[0];
      const saved = latest
        ? await base44.entities.FarmAnalyticsProjection.update(latest.id, { [editingProjection]: value })
        : await base44.entities.FarmAnalyticsProjection.create({ ...Object.fromEntries(Object.entries(PROJECTIONS).map(([key, config]) => [key, config.defaultValue])), [editingProjection]: value });
      setProjections(saved);
      setProjectionFeedback('Saved successfully.');
    } catch (error) {
      setProjectionFeedback(error.message || 'Could not save. Please try again.');
    } finally {
      setSavingProjection(false);
    }
  };

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
    const isActive = (row) => !['inactive', 'archived', 'merged'].includes(lower(row.status));
    const farmCode = (farm) => text(farm.name).replace(/^farm\s*(?:land\s*)?/i, '').trim().toUpperCase();
    const activeFarms = farms.filter(isActive);
    const orderedFarms = ['A', 'B'].map((code) => activeFarms.find((farm) => farmCode(farm) === code)).filter(Boolean);
    const blockCode = (block) => text(block.block_code || block.name).replace(/^(?:farm|block)\s*/i, '').trim().toUpperCase();
    const activeFarmIds = new Set(orderedFarms.map((farm) => String(farm.id)));
    const configuredBlocks = blocks.filter((block) => isActive(block) && activeFarmIds.has(String(block.farm_id)));
    return [
      ...orderedFarms.map((farm) => ({ value: `farm:${farm.id}`, label: `Farm ${farmCode(farm)}` })),
      { value: 'all', label: 'Farm A&B' },
      ...['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'].flatMap((code) => {
        const block = configuredBlocks.find((item) => blockCode(item) === code);
        return block ? [{ value: `block:${block.id}`, label: code }] : [];
      }),
    ];
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
  const blockMoneyMax = Math.max(0, ...blockPerformanceRows.flatMap(row => blockMetric === 'yield' ? [] : blockMetric === 'cost' ? [row.cost] : blockMetric === 'revenue' ? [row.revenue] : [row.cost, row.revenue]));
  const blockMoneyCeiling = Math.max(1000, Math.ceil(blockMoneyMax / 1000) * 1000);
  const blockYieldCeiling = Math.max(4, Math.ceil(Math.max(0, ...blockPerformanceRows.map(row => row.yieldTonnes))));
  const blockMoneyTicks = Array.from({ length: 5 }, (_, index) => blockMoneyCeiling * index / 4);
  const blockYieldTicks = Array.from({ length: 5 }, (_, index) => blockYieldCeiling * index / 4);
  const blockCurrencyTick = value => value === 0 ? '₵0' : Math.abs(value) >= 1000000 ? `₵${(value / 1000000).toFixed(1)}m` : `₵${(value / 1000).toFixed(1)}k`;

  const mostProfitableBlock = blockPerformanceRows.slice().sort((a, b) => b.margin - a.margin)[0];
  const highestYieldBlock = blockPerformanceRows.slice().sort((a, b) => b.yieldTonnes - a.yieldTonnes)[0];
  const lowestCostBlock = blockPerformanceRows.slice().sort((a, b) => a.cost - b.cost)[0];
  const revenueMargin = totalRevenue > 0 ? Math.max(0, ((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  const yearLabel = `Jan–${monthLabel(now)} ${now.getFullYear()}`;
  const recentActivities = filteredActivities.slice().sort((a, b) => (
    (recordDate(b, ['activity_date', 'created_date']) || 0) - (recordDate(a, ['activity_date', 'created_date']) || 0)
  )).slice(0, 6);
  const costBreakdownPanel = <CostBreakdown costRows={costRows} farmFor={farmFor} rangeLabel={range.label} />;
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
    <label className="relative text-label">
      <span className="sr-only">Monthly performance year</span>
      <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
      <select value={trendYear} onChange={(event) => setTrendYear(Number(event.target.value))} className="h-7 rounded-md border border-border bg-card pl-6 pr-6 text-caption font-medium outline-none focus:ring-2 focus:ring-primary/25">
        {Array.from({ length: Math.max(2030, now.getFullYear(), trendYear) - 2026 + 1 }, (_, index) => 2026 + index).map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
    <Button className="h-7 bg-[#2e7d32] px-2.5 text-caption text-white hover:bg-[#1b5e20]" onClick={() => navigate('/admin/farm-daily-activities/activities/create')}><Plus className="mr-1 h-3 w-3" />Add Activity</Button>
  </div>;
  return (
    <div className="farm-analytics space-y-3 pb-4">
      {toolbarTarget ? createPortal(analyticsToolbar, toolbarTarget) : <section className="flex flex-wrap justify-end gap-2">{analyticsToolbar}</section>}

      <section className="analytics-kpis" aria-label="Farm summary">
        <SummaryKpi icon={MapPin} label="Farm Lands" value={`${visibleFarms.length} Farms · ${visibleBlocks.length} Blocks`} note={`${wholeNumber(totalTrees)} Total Trees`} tone="gold" />
        <MergedKpi first={{ icon: TrendingUp, label: 'Projected Cost', value: projections ? formatCedis(projectionValue('cost')) : '—', tone: 'red', remaining: projections ? formatCedis(projectionValue('cost') - totalCost) : '—', onClick: () => openProjection('cost') }} second={{ icon: ReceiptText, label: 'Actual Cost', value: formatCedis(totalCost), tone: 'red' }} />
        <MergedKpi first={{ icon: TrendingUp, label: 'Projected Revenue', value: projections ? formatCedis(projectionValue('revenue')) : '—', tone: 'revenue', remaining: projections ? formatCedis(projectionValue('revenue') - totalRevenue) : '—', onClick: () => openProjection('revenue') }} second={{ icon: Banknote, label: 'Actual Revenue', value: formatCedis(totalRevenue), tone: 'revenue' }} />
        <MergedKpi first={{ icon: Sprout, label: 'Projected Yield', value: projections ? `${wholeNumber(projectionValue('yield'))} tonnes` : '—', tone: 'blue', remaining: projections ? `${wholeNumber(projectionValue('yield') - totalYieldKg / 1000)} tonnes` : '—', onClick: () => openProjection('yield') }} second={{ icon: Sprout, label: 'Actual Yield', value: `${wholeNumber(totalYieldKg / 1000)} tonnes`, tone: 'blue' }} />
      </section>
      {projectionError ? <p role="alert" className="text-sm text-destructive">{projectionError}</p> : null}

      <div className="analytics-overview-grid">
      <FarmPerformanceTrends farms={farms} blocks={blocks} activities={activities} farmFilter={farmFilter} farmOptions={farmFilterOptions} farmId={selectedFarmId} blockId={selectedBlockId} year={trendYear} onYearChange={setTrendYear} blockChart={

          <AnalyticsPanel title="Cost, Revenue & Yield by Block" className="analytics-block-chart" action={<>
            <div className="analytics-legend" aria-label="Chart legend">
              {(blockMetric === 'all' || blockMetric === 'cost') && <span><i style={{ background: COST }} />Cost (₵)</span>}
              {(blockMetric === 'all' || blockMetric === 'yield') && <span><i className="rounded-full" style={{ background: YIELD }} />Yield (tonnes)</span>}
              {(blockMetric === 'all' || blockMetric === 'revenue') && <span><i style={{ background: REVENUE }} />Revenue (₵)</span>}
            </div>
            <label className="relative shrink-0">
              <span className="sr-only">Block chart metrics</span>
              <ChartNoAxesCombined className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#256b2a]" />
              <select value={blockMetric} onChange={(event) => setBlockMetric(event.target.value)} className="rounded border border-border bg-card pl-7 pr-5 text-caption">
                <option value="all">All metrics</option><option value="cost">Cost</option><option value="yield">Yield</option><option value="revenue">Revenue</option>
              </select>
            </label>
          </>}>
            {blockPerformanceRows.length ? <div className="analytics-block-chart-body overflow-x-auto px-2 pb-2 pt-4"><div className="h-full min-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={blockPerformanceRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#edf4ee" />
                  <XAxis dataKey="blockLabel" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="currency" domain={[0, blockMoneyCeiling]} ticks={blockMoneyTicks} interval={0} allowDecimals={false} tickFormatter={blockCurrencyTick} axisLine={false} tickLine={false} width={60} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="yield" orientation="right" allowDecimals={false} tickFormatter={(value) => `${Number(value.toFixed(2))}t`} domain={[0, blockYieldCeiling]} ticks={blockYieldTicks} interval={0} axisLine={false} tickLine={false} width={48} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, payload) => { const block = payload?.[0]?.payload; return block ? `${block.farmName} · ${block.blockLabel}` : ''; }} formatter={(value, name) => [name === 'Yield (tonnes)' ? `${wholeNumber(value)} tonnes` : `₵${wholeNumber(value)}`, name]} cursor={{ stroke: '#d1d5db', fill: 'transparent' }} contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }} />
                  {(blockMetric === 'all' || blockMetric === 'cost') && <Bar yAxisId="currency" dataKey="cost" name="Cost (₵)" fill={COST} maxBarSize={30} radius={[2, 2, 0, 0]} />}
                  {(blockMetric === 'all' || blockMetric === 'revenue') && <Bar yAxisId="currency" dataKey="revenue" name="Revenue (₵)" fill={REVENUE} maxBarSize={30} radius={[2, 2, 0, 0]} />}
                  {(blockMetric === 'all' || blockMetric === 'yield') && <Line yAxisId="yield" dataKey="yieldTonnes" name="Yield (tonnes)" stroke={YIELD} strokeWidth={2} dot={{ r: 3, fill: YIELD }} activeDot={{ r: 5 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div></div> : <EmptyState>No blocks match this selection.</EmptyState>}
          </AnalyticsPanel>
      } />
          <AnalyticsPanel title="Performance Highlights" className="analytics-highlights">
            <div className="space-y-3 p-3">
              <PerformanceHighlight icon={Trophy} tone="green" label="Most Profitable Block" value={mostProfitableBlock?.blockLabel || '—'} detail={`Profit: ${formatCedis(mostProfitableBlock?.margin || 0)}`} gauge={totalRevenue ? Math.min(100, Math.max(0, ((mostProfitableBlock?.margin || 0) / totalRevenue) * 100)) : 0} />
              <PerformanceHighlight icon={Sprout} tone="blue" label="Highest Yield" value={highestYieldBlock?.blockLabel || '—'} detail={`${wholeNumber(highestYieldBlock?.yieldTonnes || 0)} tonnes`} />
              <PerformanceHighlight icon={Coins} tone="red" label="Lowest Cost" value={lowestCostBlock?.blockLabel || '—'} detail={formatCedis(lowestCostBlock?.cost || 0)} />
              <PerformanceHighlight icon={ChartNoAxesCombined} tone="green" label="Revenue Performance" value={totalRevenue >= totalCost ? 'Strong' : 'Needs attention'} detail={`${wholeNumber(revenueMargin)}% margin this period`} gauge={revenueMargin} />
            </div>
          </AnalyticsPanel>
          <div className="analytics-activity-cost-row">
            {recentActivitiesPanel}
            {costBreakdownPanel}
          </div>
      </div>

      <Dialog open={Boolean(editingProjection)} onOpenChange={(open) => { if (!open && !savingProjection) setEditingProjection(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {PROJECTIONS[editingProjection]?.label}</DialogTitle>
            <DialogDescription>Set the overall farm target. This projection stays fixed when you change filters.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProjection} className="space-y-4">
            <label className="block space-y-2 text-sm" htmlFor="projection-value">
              <span>{PROJECTIONS[editingProjection]?.label} ({PROJECTIONS[editingProjection]?.unit})</span>
              <Input id="projection-value" type="number" min="0" step="0.01" required autoFocus value={projectionDraft} disabled={savingProjection} onChange={(event) => { setProjectionDraft(event.target.value); setProjectionFeedback(''); }} />
            </label>
            {projectionFeedback ? <p role="status" className="text-sm">{projectionFeedback}</p> : null}
            {projectionError ? <p role="alert" className="text-sm text-destructive">{projectionError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingProjection} onClick={() => setEditingProjection(null)}>{projectionFeedback === 'Saved successfully.' ? 'Done' : 'Cancel'}</Button>
              <Button type="submit" disabled={savingProjection || !projections}>{savingProjection ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>



    </div>
  );
}
