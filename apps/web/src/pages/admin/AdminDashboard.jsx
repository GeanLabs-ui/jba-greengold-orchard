import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Bug, ClipboardList, Clock3, Coins, Droplets, Globe2, House, Leaf, MapPin, PackageOpen, Plane, ReceiptText, Sprout, TrendingUp, Truck, Warehouse } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { buildOrchardDashboard, filterBlockManagement, groupPerformance, percentage, readable } from '@/lib/orchard-dashboard';
import { dashboardSources, loadDashboardRecords } from '@/lib/dashboard-sources';
import ExpenseBreakdownContent from '@/components/farm/ExpenseBreakdownContent';
import CircleCediSign from '@/components/icons/CircleCediSign';
import { DashboardExportContext } from '@/components/admin/DashboardExportContext';
import './orchard-dashboard.css';

const sources = dashboardSources;
const colors = ['#f59e0b', '#10b981', '#6960f5', '#38bdf8', '#aab0b7'];

const number = (value) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 3 }).format(value);
const money = (value) => `₵${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value)}`;
const compact = (value) => `₵${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value)}`;
const axisMoney = (value) => `₵${new Intl.NumberFormat('en-GH', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
const pct = (value, total) => percentage(value, total) === null ? '—' : `${percentage(value, total)}%`;
const farmPath = '/admin/farm-daily-activities/activities/farms';

function Panel({ title, icon: Icon, className = '', action, children }) {
  return <section className={`orchard-panel ${className}`}><header className="orchard-panel-heading"><h2><Icon aria-hidden="true" /><span>{title}</span></h2>{action}</header>{children}</section>;
}
function Metric({ title, value, icon: Icon, tone = 'green', children }) {
  return <section className="orchard-metric"><span className={`orchard-metric-icon ${tone}`}><Icon aria-hidden="true" /></span><div><h2>{title}</h2><strong>{value}</strong></div>{children}</section>;
}
function Donut({ rows, value, label, palette = colors, kicker }) {
  const slices = rows.filter((row) => row.value > 0);
  return <div className="orchard-donut" role="img" aria-label={`${label}: ${value}. ${slices.map((row) => `${row.name}: ${number(row.value)}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={slices.length ? slices : [{ name: 'No records', value: 1 }]} dataKey="value" nameKey="name" innerRadius="61%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1} isAnimationActive={false}>{(slices.length ? slices : [{}]).map((row, index) => <Cell key={row.name || index} fill={slices.length ? palette[rows.indexOf(row) % palette.length] : '#e4ebef'} />)}</Pie>{slices.length > 0 && <Tooltip formatter={(amount, name) => [number(amount), name]} />}</PieChart></ResponsiveContainer><div className="orchard-donut-label">{kicker && <span className="orchard-donut-kicker">{kicker}</span>}<strong>{value}</strong><small>{label}</small></div></div>;
}
function Legend({ rows, total, currency = false, palette = colors, percentageFormatter = pct }) {
  return <ul className="orchard-legend">{rows.map((row, index) => <li key={row.name}><i style={{ backgroundColor: palette[index % palette.length] }} /><div><span>{row.name}</span><strong>{percentageFormatter(row.value, total)}</strong><small>{currency ? money(row.value) : `${number(row.value)} Kg`}</small></div></li>)}{!rows.length && <li className="orchard-empty">No records yet</li>}</ul>;
}
function Status({ value }) { return <span className={`orchard-status ${/fruit|progress|prun/i.test(value) ? 'amber' : /flower|schedul|plan/i.test(value) ? 'blue' : /inactive|record/i.test(value) ? 'neutral' : ''}`}>{readable(value)}</span>; }
function Progress({ value, label, color = '#51a545' }) { return <div className="orchard-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-valuetext={value == null ? 'Not recorded' : `${value}%`}><span style={{ width: `${Math.min(100, Math.max(0, value || 0))}%`, backgroundColor: color }} /></div>; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const { setExportAction } = useContext(DashboardExportContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState('Monthly');
  const [exporting, setExporting] = useState(false);
  const [selectedScope, setSelectedScope] = useState('all');
  const generation = useRef(0);
  const dashboardRef = useRef(null);
  const year = new Date().getFullYear();
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const records = await loadDashboardRecords(base44.entities);
      if (request !== generation.current) return;
      setData(records);
      setError('');
    } catch (failure) { if (request === generation.current) setError(failure.message || 'Dashboard records could not be loaded.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    load(); let timer;
    const unsubscribe = subscribeToDataChanges(() => { clearTimeout(timer); timer = setTimeout(load, 180); }, Object.values(sources));
    const refreshVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', refreshVisible);
    const interval = setInterval(refreshVisible, 60000);
    return () => { generation.current += 1; clearTimeout(timer); clearInterval(interval); window.removeEventListener('focus', refreshVisible); unsubscribe(); };
  }, [load]);
  const model = useMemo(() => buildOrchardDashboard(data || {}, year), [data, year]);
  const chart = useMemo(() => groupPerformance(model.months, period, year), [model, period, year]);
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { exportDashboardPdf } = await import('@/lib/export-dashboard-pdf');
      await exportDashboardPdf(dashboardRef.current, `orchard-dashboard-${year}.pdf`);
    } catch { setError('The PDF could not be exported. Please try again.'); }
    finally { setExporting(false); }
  }, [year]);
  useEffect(() => {
    setExportAction({ onExport: exportPdf, ready: Boolean(data), exporting });
    return () => setExportAction(null);
  }, [setExportAction, exportPdf, data, exporting]);
  const sales = model.sales.filter((row) => row.value > 0);
  const salesPalette = sales.map((row) => row.name === 'Export Sales' ? '#10b981' : row.name === 'Local Sales' ? '#f59e0b' : '#5b98dc');
  const health = [{ label: 'Tree Health', icon: Leaf }, { label: 'Irrigation Coverage', icon: Droplets }, { label: 'Pest & Disease Status', icon: Bug }, { label: 'Harvest Readiness', icon: Sprout }, { label: 'Packhouse Readiness', icon: Warehouse }];
  return <div ref={dashboardRef} className="orchard-dashboard" data-preserve-colors="true">
    {error && <div className="orchard-error" role="alert">{error} {data ? 'Showing the last loaded records.' : 'Use the refresh control in the navigation bar to retry.'}</div>}
    {!data ? <div className="orchard-loading" role="status">{loading ? 'Loading orchard dashboard…' : 'Dashboard data unavailable.'}</div> : <>
      <div className="orchard-metrics">
        <div className="orchard-farm-summary" role="group" aria-label="Farm overview">
        <Metric title="Total Main Farms" value={model.farms.length} icon={MapPin} />
        <Metric title="Total Farm Blocks" value={model.blocks.length} icon={MapPin} tone="gold" />
        </div>
        <div className="orchard-output-summary">
        <Metric title="Total Production" value={<>{number(model.harvested)} <em>Kg</em></>} icon={PackageOpen} />
        <Metric title="Mango Varieties" value={model.varietyNames.length} icon={Sprout} />
        </div>
        <div className="orchard-finance-summary">
        <Metric title="Total Revenue" value={money(model.revenue)} icon={Coins} />
        <Metric title="Total Cost" value={money(model.cost)} icon={ReceiptText} tone="red" />
        <Metric title="Sales Balance" value={money(model.profit)} icon={BarChart3} />
        </div>
        <Metric title="Sales Mix" value={<><em>{pct(model.sales[0].value, model.revenue)} Export</em></>} icon={Truck}><div className="orchard-sales-mix" aria-label="Sales mix">{model.revenue > 0 && model.sales.map((row, index) => <span key={row.name} title={`${row.name}: ${pct(row.value, model.revenue)}`} style={{ width: `${row.value / model.revenue * 100}%`, backgroundColor: colors[index] }} />)}</div></Metric>
      </div>
      <div className="orchard-workspace-summaries">
        {model.departments.map((department) => <Panel key={department.title} title={department.title} icon={department.title === 'Production Summary' ? Sprout : TrendingUp} className="orchard-workspace-summary" action={<span className="orchard-heading-badge">{department.title === 'Production Summary' ? `Season ${year}` : 'Commercial Ledger'}</span>}>
          <div className="orchard-record-grid">{department.items.map((item) => <Link className={item.label === 'Payments received' ? 'payment' : item.label === 'Approvals' ? 'approval' : item.label === 'Risk register' ? 'risk' : ''} key={item.label} to={item.path}><span>{item.label}</span><strong>{item.currency ? money(item.value) : number(item.value)}</strong></Link>)}</div>
        </Panel>)}
      </div>
      <div className="orchard-analysis">
        <Panel title="Business Performance" icon={TrendingUp} className="orchard-business" action={<div className="orchard-tabs" aria-label="Performance period">{['Monthly', 'Quarterly', 'Yearly'].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div>}>
          <div className="orchard-business-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 8, right: 7, left: -14, bottom: 0 }}><CartesianGrid stroke="#e8edf0" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#546174' }} axisLine={{ stroke: '#cbd5df' }} tickLine={false} interval={0} /><YAxis allowDataOverflow domain={[0, 'auto']} allowDecimals={false} tickFormatter={axisMoney} tick={{ fontSize: 10, fill: '#546174' }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value, label) => [money(value), readable(label)]} /><Bar name="Revenue" dataKey="revenue" fill="#27c397" maxBarSize={15} isAnimationActive={false} /><Bar name="Cost" dataKey="cost" fill="#fb7185" maxBarSize={15} isAnimationActive={false} /><Line name="Profit" dataKey="profit" stroke="#3266cc" strokeWidth={2} dot={{ r: 3, fill: '#3266cc', stroke: '#fff', strokeWidth: 1 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="orchard-chart-key"><span><i style={{ background: '#27c397' }} />Revenue (₵)</span><span><i style={{ background: '#fb7185' }} />Cost (₵)</span><span><i style={{ background: '#3266cc' }} />Profit (₵)</span></div>
        </Panel>
        <Panel title="Sales Breakdown" icon={CircleCediSign} className="orchard-sales"><div className="orchard-split"><Donut rows={sales} value={compact(model.revenue)} label="Total Revenue" palette={salesPalette} /><Legend rows={sales} total={model.revenue} currency palette={salesPalette} /></div><div className="orchard-markets"><Globe2 /><div><strong>Export Markets</strong><span>{model.markets.join(' | ') || 'No export destinations recorded'}</span></div><Plane /></div></Panel>
        <Panel title="Expense Breakdown" icon={ReceiptText} className="orchard-expenses"><ExpenseBreakdownContent rows={model.expenses} farms={model.expenseFarms} /></Panel>
        <Panel title="Orchard Health & Operations" icon={Sprout} className="orchard-health"><div className="orchard-health-rows">{health.map(({ label, icon: Icon }, index) => <div className="orchard-health-row" key={label}><Icon style={{ color: index === 1 ? '#519fe0' : index === 3 ? '#dfaf00' : '#42894e' }} /><span>{label}</span><strong title="No percentage assessment is recorded">—</strong><Progress value={null} label={label} /></div>)}</div><p className="orchard-health-note">Percentage assessments not recorded</p></Panel>
      </div>
      <div className="orchard-production-row">
        <Panel title="Production Overview" icon={BarChart3} className="orchard-production"><div className="orchard-table-scroll"><table><thead><tr><th>Main Farm</th><th>Blocks</th><th>Total Production<br />(Kg)</th><th>Share</th><th>Status</th></tr></thead><tbody>{model.production.map((farm) => <tr key={farm.id}><td><Link to={`${farmPath}/${encodeURIComponent(farm.id)}`}>{farm.name}</Link><small>{farm.location || farm.region}</small></td><td>{farm.blocks.length}</td><td>{number(farm.yieldKg)}</td><td>{pct(farm.yieldKg, model.harvested)}</td><td><Status value={farm.status} /></td></tr>)}{model.unallocated > 0 && <tr><td>Unallocated output</td><td>—</td><td>{number(model.unallocated)}</td><td>{pct(model.unallocated, model.harvested)}</td><td>—</td></tr>}</tbody><tfoot><tr><td>Total</td><td>{model.blocks.length}</td><td>{number(model.harvested)}</td><td>{model.harvested > 0 ? '100%' : '—'}</td><td /></tr></tfoot></table></div></Panel>
        <Panel title="Variety Distribution (All Blocks)" icon={Leaf} className="orchard-varieties" action={<span className="orchard-cultivars">🥭 {model.varietyNames.length} Cultivars</span>}><div className="orchard-variety-body"><Donut rows={model.varieties} value={`${number(model.harvested)} Kg`} label="Total Production" /><Legend rows={model.varieties} total={model.harvested} /></div><details className="orchard-variety-details"><summary>Variety Split by Farm Block</summary>{model.production.map(farm => <div key={farm.id}>{farm.name}: {farm.blocks.map(block => block.mango_variety || 'Unrecorded').join(', ')}</div>)}</details></Panel>
        <Panel title="Harvest & Sales" icon={Sprout} className="orchard-harvest"><div className="orchard-harvest-tiles"><div><PackageOpen /><span>Harvested<strong>{number(model.harvested)} <em>Kg</em></strong><small>{model.forecast > 0 ? `${pct(model.harvested, model.forecast)} of forecast` : 'Recorded output'}</small></span></div><div><Clock3 /><span>Remaining<strong>{model.forecast > 0 ? number(model.remaining) : '—'} <em>Kg</em></strong><small>{model.forecast > 0 ? `${pct(model.remaining, model.forecast)} of forecast` : 'No forecast recorded'}</small></span></div></div><Progress value={percentage(model.harvested, model.forecast)} label="Harvest progress" /><p>{number(model.harvested)} Kg harvested <span>|</span> {model.forecast > 0 ? `${number(model.remaining)} Kg remaining` : 'Forecast unavailable'}</p></Panel>
        <Panel title="Upcoming Farm Tasks" icon={ClipboardList} className="orchard-tasks" action={<Link to="/admin/calendar">View All</Link>}><div className="orchard-task-list">{model.tasks.slice(0, 3).map(task => <article key={task.id}><div><time>{new Date(task.date).toLocaleDateString('en', { month: 'short', day: '2-digit' })}</time><Status value={task.status || 'scheduled'} /></div><Link className="orchard-task-link" to={task.path}>{task.title}</Link><small>{task.scope}</small></article>)}{!model.tasks.length && <div className="orchard-empty">No upcoming farm tasks scheduled</div>}</div></Panel>
      </div>
      <section className="orchard-block-management">
        <header>
          <div className="orchard-block-title"><House /><div><h2>Farm Land &amp; Block Management</h2><p>Consolidated overview across all orchard production blocks</p></div></div>
          <select className="orchard-scope-filter" aria-label="Filter farms and blocks" value={selectedScope} onChange={(event) => setSelectedScope(event.target.value)}>
            <option value="all">All Farms &amp; Blocks</option>
            {model.blockManagement.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </select>
          <span>Total Production: <b>{number(model.harvested)} Kg</b> | {model.blocks.length} Active Blocks</span>
        </header>
        <div className="orchard-table-scroll">
          <table className="orchard-management-table">
            <colgroup><col className="scope" /><col className="trees" /><col className="area" /><col className="variety" /><col className="yield" /><col className="status" /></colgroup>
            <thead><tr><th scope="col">Block</th><th scope="col">Total Trees</th><th scope="col">Area (acres)</th><th scope="col">Mango Variety</th><th scope="col">Actual Yield (Kg)</th><th scope="col">Current Status</th></tr></thead>
            <tbody>{filterBlockManagement(model.blockManagement, selectedScope).map((row) => <tr key={row.id} className={row.kind === 'block' ? '' : 'orchard-shared-block'}>
              <th scope="row">{row.kind === 'block' ? <Link className="orchard-block-link" to={`${farmPath}/${encodeURIComponent(row.farm_id)}/blocks/${encodeURIComponent(row.block_id)}`}>{row.label}</Link> : <span title={`Yield from daily logs recorded for ${row.label}`}>{row.label}</span>}</th>
              <td>{row.total_trees == null ? '—' : number(row.total_trees)}</td>
              <td>{row.area_acres == null ? '—' : number(row.area_acres)}</td>
              <td>{row.mango_variety || '—'}</td>
              <td>{number(row.actual_yield_kg || 0)}</td>
              <td><Status value={row.status} /></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <footer className="orchard-footer"><span><i />Green Gold Orchard Management System <small>· v2.6.4 Connected</small></span><span>Logged in as <b>{user?.full_name || user?.name || user?.email || 'Administrator'}</b></span></footer>
    </>}
  </div>;
}
