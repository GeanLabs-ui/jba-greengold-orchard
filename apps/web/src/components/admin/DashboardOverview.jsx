import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, CalendarDays, CircleCheck, Banknote } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminNavSections } from './admin-navigation';
import { buildDashboardAnalytics } from '@/lib/admin-dashboard';
import { formatCurrency, formatNumber } from '@/components/shared/format';
import './dashboard-overview.css';

const production = '/admin/farm-daily-activities/activities';
const lower = (value) => String(value || '').toLowerCase();
const open = (row) => !['completed', 'delivered', 'cancelled', 'closed', 'rejected', 'hired'].includes(lower(row.status));

export default function DashboardOverview({ data }) {
  const summary = useMemo(() => buildDashboardAnalytics(data), [data]);
  const current = summary.months.at(-1);
  return <div className="dashboard-overview">
    <div className="dashboard-section-heading"><div><h2 className="text-section-title">Production performance</h2><p>Monthly output and costs from the daily activity log.</p></div><Link to={`${production}/overview`}>Operations analytics <ArrowRight size={14} /></Link></div>
    <div className="dashboard-summary-grid">
      <Summary icon={Sprout} label="Yield this month" value={`${formatNumber(current.yield)} kg`} detail={`${data.farms.filter((row) => !['inactive', 'archived', 'merged'].includes(lower(row.status))).length} active farms · ${data.blocks.length} blocks`} path={`${production}/overview`} />
      <Summary icon={Banknote} label="Production costs this month" value={formatCurrency(current.costs)} detail="Daily activity actual costs" path="/admin/finance" />
      <Summary icon={CircleCheck} label="Activity completion" value={summary.completion === null ? '—' : `${summary.completion}%`} detail={`${summary.completed} of ${summary.total} activities · all time`} path={`${production}/completed`} />
      <Summary icon={CalendarDays} label="Overdue activities" value={summary.overdue.length} detail="Open activities dated before today" path={`${production}/pending`} />
    </div>
    <div className="dashboard-chart-grid">
      <ChartPanel title="Production output" description="Recorded yield in kg · rolling six months" path={`${production}/overview`}>
        {summary.months.some((row) => row.yield > 0) ? <ResponsiveContainer width="100%" height={230}><BarChart data={summary.months} margin={{ left: 0, right: 10, top: 12 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} width={85} tickFormatter={(value) => formatNumber(value)} /><Tooltip formatter={(value) => [`${formatNumber(value)} kg`, 'Yield']} /><Bar dataKey="yield" isAnimationActive={false} fill="#2e7d32" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer> : <Empty>No production output recorded in the last six months.</Empty>}
      </ChartPanel>
      <ChartPanel title="Order progress" description="Current order status · all time" path="/admin/orders">
        <Bars rows={summary.orderStages} format={formatNumber} empty="No orders recorded yet." />
      </ChartPanel>
      <ChartPanel title="Production cost breakdown" description="This month · costs recorded against daily activities" path="/admin/finance">
        <Bars rows={summary.costs} format={formatCurrency} empty="No production costs recorded this month." />
      </ChartPanel>
    </div>
    <section className="dashboard-attention"><div><h2 className="text-section-title">Needs attention</h2><p>Open items across production and business.</p></div><div className="dashboard-attention-links">
      <Link to={`${production}/pending`}><strong>{summary.overdue.length}</strong> overdue activities <ArrowRight size={14} /></Link>
      <Link to="/admin/inquiries"><strong>{data.inquiries.filter((row) => !row.status || lower(row.status) === 'new').length}</strong> new inquiries <ArrowRight size={14} /></Link>
      <Link to="/admin/export-ops"><strong>{data.exports.filter((row) => lower(row.status) === 'delayed').length}</strong> delayed exports <ArrowRight size={14} /></Link>
    </div></section>

  </div>;
}
function Summary({ icon: Icon, label, value, detail, path }) { return <Link to={path} className="dashboard-summary"><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><p>{detail}</p></Link>; }
function ChartPanel({ title, description, path, children }) { return <section className="dashboard-chart"><div className="dashboard-chart-title"><h2 className="text-section-title">{title}</h2><Link to={path} aria-label={`View ${title}`}><ArrowRight size={17} /></Link></div><p>{description}</p>{children}</section>; }
function Empty({ children }) { return <div className="dashboard-chart-empty">{children}</div>; }
function Bars({ rows, format, empty }) { const total = rows.reduce((sum, row) => sum + row.value, 0); return rows.length ? <div className="dashboard-bars">{rows.map((row) => <div key={row.name}><div><span className="capitalize">{row.name}</span><strong>{format(row.value)}</strong></div><div className="dashboard-bar-track"><span style={{ width: `${total ? row.value / total * 100 : 0}%` }} /></div></div>)}</div> : <Empty>{empty}</Empty>; }

export function DashboardDepartments({ data, expensesMtd }) {
  const summary = useMemo(() => buildDashboardAnalytics(data), [data]);
  const departmentNotes = {
    '/admin/client-management': `${data.customers.length} customers · ${data.inquiries.filter(open).length} open inquiries`,
    '/admin/marketing': `${data.orders.length} orders · ${data.products.length} products`,
    '/admin/inventory': `${data.stock.length} stock items`,
    '/admin/logistics': `${data.deliveries.filter(open).length} open deliveries`,
    '/admin/procurement': `${data.purchaseOrders.filter(open).length} open purchase orders`,
    '/admin/finance': `${formatCurrency(expensesMtd)} activity costs this month`,
    '/admin/export-ops': `${data.exports.filter(open).length} open export shipments`,
    [production]: `${summary.completed} / ${summary.total} activities completed`,
    '/admin/farm-daily-activities/equipment': `${data.equipment.length} equipment records`,
    '/admin/farm-daily-activities/reports': 'Production, labour, harvest and cost reports',
    '/admin/calendar': `${data.calendarEvents.filter((row) => open(row) && new Date(row.start_at) >= new Date()).length} upcoming events`,
    '/admin/hr': `${data.employees.length} staff records`,
    '/admin/applications': `${data.applications.filter(open).length} open applications`,
    '/admin/documents': `${data.documents.length} documents`,
    '/admin/reports': 'Business reporting and exports',
    '/admin/system-log': 'Activity history and audit trail',
    '/admin/settings': 'Workspace configuration',
  };
  return (    <details className="dashboard-departments" open><summary className="text-section-title">Department overview</summary><p className="text-xs text-muted-foreground mt-1 mb-4">Current records across business, production and system pages. Select a department to explore.</p>
      {adminNavSections.map((section) => <div key={section.title} className="dashboard-department-group"><h3>{section.title}</h3><div className="dashboard-department-grid">{section.items.map(({ label, path, icon: Icon }) => <Link key={path} to={path}><Icon size={18} /><div><strong>{label}</strong><span>{departmentNotes[path] || 'Open workspace'}</span></div><ArrowRight size={14} /></Link>)}</div></div>)}
    </details>);
}
