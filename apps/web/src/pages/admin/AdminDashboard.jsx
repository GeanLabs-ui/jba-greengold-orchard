import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Bug, CircleDollarSign, ClipboardList, Clock3, Coins, Droplets, Globe2, House, Leaf, MapPin, PackageOpen, Plane, ReceiptText, Sprout, TrendingUp, Truck, Warehouse } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { buildOrchardDashboard, groupPerformance, percentage, readable } from '@/lib/orchard-dashboard';
import { dashboardSources, loadDashboardRecords } from '@/lib/dashboard-sources';
import { formatCostPercentage } from '@/lib/activity-cost-types';
import ExpensePhotoChart from '@/components/farm/ExpensePhotoChart';
import { DashboardExportContext } from '@/components/admin/DashboardExportContext';
import './orchard-dashboard.css';

const sources = dashboardSources;
const colors = ['#51a545', '#f3c400', '#5d97d8', '#8b63bf', '#aab0b7'];

const number = (value) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value);
const money = (value) => `₵${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value)}`;
const compact = (value) => `₵${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value)}`;
const pct = (value, total) => percentage(value, total) === null ? '—' : `${percentage(value, total)}%`;
const farmPath = '/admin/farm-daily-activities/activities/farms';

function Panel({ title, icon: Icon, className = '', action, children }) {
  return <section className={`orchard-panel ${className}`}><header className="orchard-panel-heading"><h2><Icon aria-hidden="true" /><span>{title}</span></h2>{action}</header>{children}</section>;
}
function Metric({ title, value, note, icon: Icon, tone = 'green', children }) {
  return <section className="orchard-metric"><span className={`orchard-metric-icon ${tone}`}><Icon aria-hidden="true" /></span><div><h2>{title}</h2><strong>{value}</strong><small>{note}</small></div>{children}</section>;
}
function Donut({ rows, value, label, palette = colors }) {
  const slices = rows.filter((row) => row.value > 0);
  return <div className="orchard-donut" role="img" aria-label={`${label}: ${value}. ${slices.map((row) => `${row.name}: ${number(row.value)}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={slices.length ? slices : [{ name: 'No records', value: 1 }]} dataKey="value" nameKey="name" innerRadius="61%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1} isAnimationActive={false}>{(slices.length ? slices : [{}]).map((row, index) => <Cell key={row.name || index} fill={slices.length ? palette[rows.indexOf(row) % palette.length] : '#e4ebef'} />)}</Pie>{slices.length > 0 && <Tooltip formatter={(amount, name) => [number(amount), name]} />}</PieChart></ResponsiveContainer><div className="orchard-donut-label"><strong>{value}</strong><small>{label}</small></div></div>;
}
function Legend({ rows, total, currency = false, palette = colors, percentageFormatter = pct }) {
  return <ul className="orchard-legend">{rows.map((row, index) => <li key={row.name}><i style={{ backgroundColor: palette[index % palette.length] }} /><div><span>{row.name}</span><strong>{percentageFormatter(row.value, total)}</strong><small>{currency ? money(row.value) : `${number(row.value)} tons`}</small></div></li>)}{!rows.length && <li className="orchard-empty">No records yet</li>}</ul>;
}
function Status({ value }) { return <span className={`orchard-status ${/fruit|progress|prun/i.test(value) ? 'amber' : /flower|schedul|plan/i.test(value) ? 'blue' : /inactive|record/i.test(value) ? 'neutral' : ''}`}>{readable(value)}</span>; }
function Progress({ value, label, color = '#51a545' }) { return <div className="orchard-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-valuetext={value == null ? 'Not recorded' : `${value}%`}><span style={{ width: `${Math.min(100, Math.max(0, value || 0))}%`, backgroundColor: color }} /></div>; }

export default function AdminDashboard() {
  const { setExportAction } = useContext(DashboardExportContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState('Monthly');
  const [exporting, setExporting] = useState(false);
  const generation = useRef(0);
  const analysisRef = useRef(null);
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
  useEffect(() => {
    const analysis = analysisRef.current;
    const reference = analysis?.querySelector('.orchard-business');
    if (!reference) return;
    const syncHeight = () => analysis.style.setProperty('--orchard-performance-height', `${reference.getBoundingClientRect().height}px`);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(reference);
    return () => observer.disconnect();
  }, [Boolean(data)]);
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
  const salesPalette = sales.map((row) => row.name === 'Export Sales' ? colors[0] : row.name === 'Local Sales' ? colors[1] : colors[2]);
  const health = [{ label: 'Tree Health', icon: Leaf }, { label: 'Irrigation Coverage', icon: Droplets }, { label: 'Pest & Disease Status', icon: Bug }, { label: 'Harvest Readiness', icon: Sprout }, { label: 'Packhouse Readiness', icon: Warehouse }];
  return <div ref={dashboardRef} className="orchard-dashboard" data-preserve-colors="true">
    {error && <div className="orchard-error" role="alert">{error} {data ? 'Showing the last loaded records.' : 'Use the refresh control in the navigation bar to retry.'}</div>}
    {!data ? <div className="orchard-loading" role="status">{loading ? 'Loading orchard dashboard…' : 'Dashboard data unavailable.'}</div> : <>
      <div className="orchard-metrics">
        <div className="orchard-farm-summary" role="group" aria-label="Farm overview">
        <Metric title="Total Main Farms" value={model.farms.length} note="Farms under management" icon={MapPin} />
        <Metric title="Total Farm Blocks" value={model.blocks.length} note="Across all main farms" icon={MapPin} tone="gold" />
        <Metric title="Mango Varieties" value={model.varietyNames.length} note={model.varietyNames.join(', ') || 'No varieties recorded'} icon={Sprout} />
        </div>
        <Metric title="Total Production" value={<>{number(model.harvested)} <em>tons</em></>} note={`${year} recorded output`} icon={PackageOpen} />
        <Metric title="Total Revenue" value={money(model.revenue)} note={`${year} sales value`} icon={Coins} />
        <Metric title="Total Cost" value={money(model.cost)} note={`${year} activity costs`} icon={ReceiptText} tone="red" />
        <Metric title="Sales Balance" value={money(model.profit)} note="Order sales less activity costs" icon={BarChart3} />
        <Metric title="Sales Mix" value={<><em>{pct(model.sales[0].value, model.revenue)} Export</em></>} note={`${pct(model.sales[1].value, model.revenue)} Local · ${pct(model.sales[2].value, model.revenue)} Unclassified`} icon={Truck}><div className="orchard-sales-mix" aria-label="Sales mix">{model.revenue > 0 && model.sales.map((row, index) => <span key={row.name} title={`${row.name}: ${pct(row.value, model.revenue)}`} style={{ width: `${row.value / model.revenue * 100}%`, backgroundColor: colors[index] }} />)}</div></Metric>
      </div>
      <div className="orchard-workspace-summaries">
        {model.departments.map((department) => <Panel key={department.title} title={department.title} icon={department.title === 'Production Summary' ? Sprout : TrendingUp} className="orchard-workspace-summary">
          <div className="orchard-record-grid">{department.items.map((item) => <Link key={item.label} to={item.path}><span>{item.label}</span><strong>{item.currency ? money(item.value) : number(item.value)}</strong><small>{item.note}</small></Link>)}</div>
        </Panel>)}
      </div>
      <div className="orchard-analysis" ref={analysisRef}>
        <Panel title="Business Performance" icon={TrendingUp} className="orchard-business" action={<div className="orchard-tabs" aria-label="Performance period">{['Monthly', 'Quarterly', 'Yearly'].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div>}>
          <div className="orchard-business-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 8, right: 7, left: -14, bottom: 0 }}><CartesianGrid stroke="#e8edf0" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#546174' }} axisLine={{ stroke: '#cbd5df' }} tickLine={false} interval={0} /><YAxis allowDecimals={false} tickFormatter={compact} tick={{ fontSize: 10, fill: '#546174' }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value, label) => [money(value), readable(label)]} /><Bar name="Revenue" dataKey="revenue" fill="#72b86c" maxBarSize={15} isAnimationActive={false} /><Bar name="Cost" dataKey="cost" fill="#e64e52" maxBarSize={15} isAnimationActive={false} /><Line name="Profit" dataKey="profit" stroke="#3266cc" strokeWidth={2} dot={{ r: 3, fill: '#3266cc', stroke: '#fff', strokeWidth: 1 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="orchard-chart-key"><span><i style={{ background: '#72b86c' }} />Revenue (₵)</span><span><i style={{ background: '#e64e52' }} />Cost (₵)</span><span><i style={{ background: '#3266cc' }} />Profit (₵)</span></div>
        </Panel>
        <Panel title="Sales Breakdown" icon={CircleDollarSign} className="orchard-sales"><div className="orchard-split"><Donut rows={sales} value={compact(model.revenue)} label="Total Revenue" palette={salesPalette} /><Legend rows={sales} total={model.revenue} currency palette={salesPalette} /></div><div className="orchard-markets"><Globe2 /><div><strong>Export Markets</strong><span>{model.markets.join(' | ') || 'No export destinations recorded'}</span></div><Plane /></div></Panel>
        <Panel title="Expense Breakdown" icon={ReceiptText} className="orchard-expenses"><ExpensePhotoChart seedData rows={model.expenses} total={model.expenseTotal} /><details className="orchard-expense-farms"><summary>Cost Split by Main Farm</summary>{model.expenseFarms.map((farm) => <div key={farm.name}><span><MapPin aria-hidden="true" />{farm.name}</span><strong>{money(farm.value)} · {formatCostPercentage(farm.value, model.expenseTotal)}</strong></div>)}<div className="orchard-expense-total"><span>Total Cost</span><strong>{money(model.expenseTotal)}</strong></div></details></Panel>
        <Panel title="Orchard Health & Operations" icon={Sprout} className="orchard-health"><div className="orchard-health-rows">{health.map(({ label, icon: Icon }, index) => <div className="orchard-health-row" key={label}><Icon style={{ color: index === 1 ? '#519fe0' : index === 3 ? '#dfaf00' : '#42894e' }} /><span>{label}</span><strong title="No percentage assessment is recorded">—</strong><Progress value={null} label={label} /></div>)}</div><p className="orchard-health-note">Percentage assessments not recorded</p></Panel>
      </div>
      <div className="orchard-production-row">
        <Panel title="Production Overview" icon={BarChart3} className="orchard-production"><div className="orchard-table-scroll"><table><thead><tr><th>Main Farm</th><th>Blocks</th><th>Total Production<br />(tons)</th><th>Share</th><th>Status</th></tr></thead><tbody>{model.production.map((farm) => <tr key={farm.id}><td><Link to={`${farmPath}/${encodeURIComponent(farm.id)}`}>{farm.name}</Link><small>{farm.location || farm.region}</small></td><td>{farm.blocks.length}</td><td>{number(farm.tonnes)}</td><td>{pct(farm.tonnes, model.harvested)}</td><td><Status value={farm.status} /></td></tr>)}{model.unallocated > 0 && <tr><td>Unallocated output</td><td>—</td><td>{number(model.unallocated)}</td><td>{pct(model.unallocated, model.harvested)}</td><td>—</td></tr>}</tbody><tfoot><tr><td>Total</td><td>{model.blocks.length}</td><td>{number(model.harvested)}</td><td>{model.harvested > 0 ? '100%' : '—'}</td><td /></tr></tfoot></table></div></Panel>
        <Panel title="Variety Distribution (All Blocks)" icon={Leaf} className="orchard-varieties"><div className="orchard-variety-body"><Donut rows={model.varieties} value={`${number(model.harvested)} tons`} label="Total Production" /><Legend rows={model.varieties} total={model.harvested} /><img src="/pages/export/mango-basket.webp" alt="Fresh orchard mangoes" /></div></Panel>
        <Panel title="Harvest & Sales Status" icon={Sprout} className="orchard-harvest"><div className="orchard-harvest-tiles"><div><PackageOpen /><span>Harvested<strong>{number(model.harvested)} <em>tons</em></strong><small>{model.forecast > 0 ? `${pct(model.harvested, model.forecast)} of forecast` : 'Recorded output'}</small></span></div><div><Clock3 /><span>Remaining<strong>{model.forecast > 0 ? number(model.remaining) : '—'} <em>tons</em></strong><small>{model.forecast > 0 ? `${pct(model.remaining, model.forecast)} of forecast` : 'No forecast recorded'}</small></span></div></div><Progress value={percentage(model.harvested, model.forecast)} label="Harvest progress" /><p>{number(model.harvested)} tons harvested <span>|</span> {model.forecast > 0 ? `${number(model.remaining)} tons remaining` : 'Forecast unavailable'}</p></Panel>
        <Panel title="Upcoming Farm Tasks" icon={ClipboardList} className="orchard-tasks" action={<Link to="/admin/calendar">View All</Link>}><div className="orchard-table-scroll"><table><thead><tr><th>Date</th><th>Task</th><th>Farm / Block</th><th>Status</th></tr></thead><tbody>{model.tasks.slice(0, 6).map((task) => <tr key={task.id}><td>{new Date(task.date).toLocaleDateString('en', { month: 'short', day: '2-digit' })}</td><td title={task.title}><Link className="orchard-task-link" to={task.path}>{task.title}</Link></td><td>{task.scope}</td><td><Status value={task.status || 'scheduled'} /></td></tr>)}</tbody></table>{!model.tasks.length && <div className="orchard-empty">No upcoming farm tasks scheduled</div>}</div></Panel>
      </div>
      <div className="orchard-farms">{model.production.map((farm, index) => <section className="orchard-farm" key={farm.id}><header><h2><House /><Link to={`${farmPath}/${encodeURIComponent(farm.id)}`}>{farm.name || `Main Farm ${index + 1}`}</Link><small>({farm.blocks.length} Blocks)</small></h2><span>Total Production: <b>{number(farm.tonnes)} tons</b> <i>|</i> {pct(farm.tonnes, model.harvested)} of total</span></header><div className="orchard-table-scroll"><table><thead><tr><th>Block</th><th>Area (acres)</th><th>Mango Variety</th><th>Actual Yield (tonnes)</th><th>Current Status</th></tr></thead><tbody>{farm.blocks.map((block) => <tr key={block.id}><td><Link className="orchard-block-link" to={`${farmPath}/${encodeURIComponent(farm.id)}/blocks/${encodeURIComponent(block.id)}`}>{block.block_code || block.name}</Link></td><td>{block.area_acres == null ? '—' : number(block.area_acres)}</td><td>{block.mango_variety || '—'}</td><td>{number(block.actual_yield_kg / 1000)}</td><td><Status value={block.farming_stage || block.status} /></td></tr>)}</tbody></table>{!farm.blocks.length && <div className="orchard-empty">No blocks recorded</div>}</div></section>)}</div>
    </>}
  </div>;
}
