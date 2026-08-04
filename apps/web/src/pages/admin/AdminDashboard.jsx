import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowRight, Banknote, Boxes, BriefcaseBusiness, CheckCircle2,
  CalendarDays, CircleDollarSign, Clock3, FileWarning, MessageSquareText, Package, RefreshCw, ShoppingCart, Sprout, Truck, Users,
} from 'lucide-react';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatNumber, timeAgo } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const emptyData = {
  customers: [], orders: [], invoices: [], payments: [], expenses: [], stock: [], products: [], farms: [],
  harvests: [], harvestGrades: [], deliveries: [], employees: [], purchaseOrders: [], applications: [], inquiries: [], calendarEvents: [],
};
const watchedEntities = ['Customer', 'Order', 'Invoice', 'Payment', 'Expense', 'StockItem', 'Product', 'Farm', 'Harvest', 'HarvestGrade', 'Delivery', 'Employee', 'PurchaseOrder', 'JobApplication', 'Inquiry', 'CalendarEvent'];
const isOpenOrder = (order) => !['delivered', 'cancelled', 'draft'].includes(order.status);
const isSuccessfulOrder = (order) => !['cancelled', 'draft'].includes(order.status);
const asAmount = (value) => Number(value || 0);
const dateValue = (record, ...keys) => keys.map((key) => record?.[key]).find(Boolean) || record?.created_date;
const isCurrentMonth = (value) => {
  const date = new Date(value);
  const now = new Date();
  return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async (showToast = false) => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(watchedEntities.map((entity) => base44.entities[entity].list('-created_date', 250).catch(() => [])));
      const next = Object.fromEntries(Object.keys(emptyData).map((key, index) => [key, results[index] || []]));
      setData(next);
      setLastUpdated(new Date());
      if (showToast) toast({ title: 'Dashboard refreshed', description: 'All summaries now reflect the latest database records.' });
    } catch (loadError) {
      setError(loadError.message || 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(() => loadDashboard(), 180);
    }, watchedEntities);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const metrics = useMemo(() => {
    const successfulOrders = data.orders.filter(isSuccessfulOrder);
    const monthOrders = successfulOrders.filter((order) => isCurrentMonth(dateValue(order, 'order_date')));
    const completedPayments = data.payments.filter((payment) => !['failed', 'cancelled'].includes(payment.status));
    const monthPayments = completedPayments.filter((payment) => isCurrentMonth(dateValue(payment, 'payment_date')));
    const monthExpenses = data.expenses.filter((expense) => isCurrentMonth(dateValue(expense, 'expense_date')));
    const pendingInvoices = data.invoices.filter((invoice) => invoice.status !== 'paid');
    const lowStock = data.stock.filter((item) => asAmount(item.quantity_on_hand) <= asAmount(item.reorder_level));
    return {
      successfulOrders,
      salesMtd: monthOrders.reduce((sum, order) => sum + asAmount(order.total_amount), 0),
      paidMtd: monthPayments.reduce((sum, payment) => sum + asAmount(payment.amount), 0),
      expensesMtd: monthExpenses.reduce((sum, expense) => sum + asAmount(expense.amount), 0),
      outstanding: pendingInvoices.reduce((sum, invoice) => sum + asAmount(invoice.balance_due ?? invoice.total_amount), 0),
      openOrders: data.orders.filter(isOpenOrder), pendingInvoices, lowStock,
      activeDeliveries: data.deliveries.filter((delivery) => ['scheduled', 'in_transit', 'dispatched'].includes(delivery.status)),
    };
  }, [data]);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(data.orders, data.payments), [data.orders, data.payments]);
  const harvestQuality = useMemo(() => buildHarvestQuality(data.harvests, data.harvestGrades), [data.harvests, data.harvestGrades]);
  const recentOrders = [...data.orders].sort((a, b) => new Date(dateValue(b, 'order_date')) - new Date(dateValue(a, 'order_date'))).slice(0, 5);

  const exportDashboard = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const rows = [
      ['Sales value this month', formatCurrency(metrics.salesMtd)], ['Payments this month', formatCurrency(metrics.paidMtd)],
      ['Outstanding invoices', formatCurrency(metrics.outstanding)], ['Expenses this month', formatCurrency(metrics.expensesMtd)],
      ['Orders in progress', metrics.openOrders.length], ['Active deliveries', metrics.activeDeliveries.length],
      ['Customers', data.customers.length], ['Products', data.products.length], ['Active farms', data.farms.filter((farm) => farm.status !== 'inactive').length],
      ['Staff', data.employees.length], ['Low stock items', metrics.lowStock.length], ['Pending applications', data.applications.filter((item) => !['hired', 'rejected'].includes(item.status)).length],
    ];
    doc.setFontSize(17); doc.text('JBA GreenGold — Business Summary', 14, 18);
    doc.setFontSize(9); doc.text(`Generated ${new Date().toLocaleString('en-GH')}`, 14, 25);
    doc.setFontSize(11); rows.forEach(([label, value], index) => doc.text(`${label}: ${value}`, 14, 38 + index * 8));
    doc.save(`dashboard-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'Dashboard PDF exported' });
  };

  return (
    <div>
      <PageHeader title="Business Overview" description={`Live summaries from the website, sales, finance, inventory, farms, logistics, and HR${lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}` : ''}.`}>
        <Button variant="outline" size="sm" onClick={exportDashboard}>Export PDF</Button>
        <Button size="sm" onClick={() => loadDashboard(true)} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </PageHeader>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Sales value (MTD)" value={formatCurrency(metrics.salesMtd)} icon={ShoppingCart} color="primary" subtitle={`${data.orders.filter((order) => isCurrentMonth(dateValue(order, 'order_date'))).length} orders this month`} />
        <MetricCard title="Payments received (MTD)" value={formatCurrency(metrics.paidMtd)} icon={Banknote} color="green" subtitle="Confirmed receipts" />
        <MetricCard title="Orders in progress" value={String(metrics.openOrders.length)} icon={Clock3} color="blue" subtitle="Confirmed through dispatch" />
        <MetricCard title="Outstanding invoices" value={formatCurrency(metrics.outstanding)} icon={FileWarning} color="red" subtitle={`${metrics.pendingInvoices.length} awaiting payment`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div><h2 className="font-heading font-semibold">Sales and payments</h2><p className="text-xs text-muted-foreground">Rolling six-month value in GHS, calculated from live orders and receipts.</p></div>
          <ResponsiveContainer width="100%" height={280} className="mt-4"><AreaChart data={monthlyTrend}>
            <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706" stopOpacity={0.28} /><stop offset="100%" stopColor="#d97706" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={compactAmount} />
            <Tooltip formatter={(value, name) => [formatCurrency(value), name === 'sales' ? 'Sales value' : 'Payments']} contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))' }} />
            <Area type="monotone" dataKey="sales" stroke="#d97706" strokeWidth={2} fill="url(#salesFill)" /><Area type="monotone" dataKey="payments" stroke="#15803d" strokeWidth={2} fillOpacity={0} />
          </AreaChart></ResponsiveContainer>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading font-semibold">Harvest quality</h2><p className="text-xs text-muted-foreground">Recorded quantity by grade.</p>
          {harvestQuality.length ? <><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={harvestQuality} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>{harvestQuality.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${formatNumber(value)} kg`} /></PieChart></ResponsiveContainer><div className="grid grid-cols-2 gap-2">{harvestQuality.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="truncate">{item.name}</span><strong>{formatNumber(item.value)}</strong></div>)}</div></> : <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">No graded harvests yet.</div>}
        </section>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SmallMetric label="Customers" value={data.customers.length} icon={Users} path="/admin/crm" />
        <SmallMetric label="Products" value={data.products.length} icon={Package} path="/admin/content" />
        <SmallMetric label="Active farms" value={data.farms.filter((farm) => farm.status !== 'inactive').length} icon={Sprout} path="/admin/farms" />
        <SmallMetric label="Staff" value={data.employees.length} icon={Activity} path="/admin/hr" />
        <SmallMetric label="Active deliveries" value={metrics.activeDeliveries.length} icon={Truck} path="/admin/logistics" />
        <SmallMetric label="Low stock" value={metrics.lowStock.length} icon={Boxes} path="/admin/inventory" alert={metrics.lowStock.length > 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Recent orders" path="/admin/orders">
          {recentOrders.length ? recentOrders.map((order) => <div key={order.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{order.order_number}</p><p className="truncate text-xs text-muted-foreground">{order.customer_name} · {timeAgo(dateValue(order, 'order_date'))} · {order.source || 'admin'}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{formatCurrency(order.total_amount)}</p><StatusBadge status={order.status} /></div></div>) : <Empty label="No orders recorded." />}
        </Panel>
        <Panel title="Invoices awaiting payment" path="/admin/sales">
          {metrics.pendingInvoices.slice(0, 5).length ? metrics.pendingInvoices.slice(0, 5).map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{invoice.invoice_number}</p><p className="truncate text-xs text-muted-foreground">{invoice.customer_name} · {invoice.order_number || 'Manual invoice'}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-amber-700">{formatCurrency(invoice.balance_due ?? invoice.total_amount)}</p><StatusBadge status={invoice.status} /></div></div>) : <Empty label="All invoices are paid." success />}
        </Panel>
        <Panel title="Low stock alerts" path="/admin/inventory" icon={AlertCircle}>
          {metrics.lowStock.slice(0, 5).length ? metrics.lowStock.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"><div><p className="text-sm font-semibold">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.warehouse_name || 'Warehouse not set'} · {item.sku || 'No SKU'}</p></div><div className="text-right"><p className="text-sm font-semibold text-amber-700">{formatNumber(item.quantity_on_hand)} {item.unit_of_measure || ''}</p><p className="text-xs text-muted-foreground">Reorder {formatNumber(item.reorder_level)}</p></div></div>) : <Empty label="Stock levels are healthy." success />}
        </Panel>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading font-semibold">Operating summary</h2>
          <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <OperatingStat label="Expenses this month" value={formatCurrency(metrics.expensesMtd)} icon={CircleDollarSign} path="/admin/finance" />
            <OperatingStat label="Purchase orders" value={data.purchaseOrders.length} icon={BriefcaseBusiness} path="/admin/procurement" />
            <OperatingStat label="Harvest records" value={data.harvests.length} icon={Sprout} path="/admin/harvests" />
            <OperatingStat label="Open applications" value={data.applications.filter((item) => !['hired', 'rejected'].includes(item.status)).length} icon={Users} path="/admin/applications" />
            <OperatingStat label="New client inquiries" value={data.inquiries.filter((item) => item.status === 'new' || !item.status).length} icon={MessageSquareText} path="/admin/inquiries" />
            <OperatingStat label="Upcoming activities" value={data.calendarEvents.filter((item) => new Date(item.start_at) >= new Date() && !['completed', 'cancelled'].includes(item.status)).length} icon={CalendarDays} path="/admin/calendar" />
          </div>
        </section>
      </div>
    </div>
  );
}

function buildMonthlyTrend(orders, payments) {
  const formatter = new Intl.DateTimeFormat('en-GH', { month: 'short' });
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setHours(0, 0, 0, 0); date.setMonth(date.getMonth() - (5 - index));
    const year = date.getFullYear(); const monthIndex = date.getMonth();
    const inBucket = (value) => { const current = new Date(value); return current.getFullYear() === year && current.getMonth() === monthIndex; };
    return {
      month: formatter.format(date),
      sales: orders.filter((order) => isSuccessfulOrder(order) && inBucket(dateValue(order, 'order_date'))).reduce((sum, order) => sum + asAmount(order.total_amount), 0),
      payments: payments.filter((payment) => !['failed', 'cancelled'].includes(payment.status) && inBucket(dateValue(payment, 'payment_date'))).reduce((sum, payment) => sum + asAmount(payment.amount), 0),
    };
  });
}

function buildHarvestQuality(harvests, harvestGrades) {
  const totals = new Map();
  harvestGrades.forEach((grade) => totals.set(grade.grade || grade.quality_grade || 'Unspecified', (totals.get(grade.grade || grade.quality_grade || 'Unspecified') || 0) + asAmount(grade.quantity_kg || grade.total_quantity || 1)));
  harvests.forEach((harvest) => { if (harvest.quality_grade) totals.set(harvest.quality_grade, (totals.get(harvest.quality_grade) || 0) + asAmount(harvest.total_quantity || harvest.quantity_kg || 1)); });
  const colors = ['#d97706', '#15803d', '#ca8a04', '#0891b2', '#64748b'];
  return [...totals.entries()].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] })).filter((item) => item.value > 0);
}
function compactAmount(value) { return value >= 1_000_000 ? `${Math.round(value / 1_000_000)}M` : value >= 1_000 ? `${Math.round(value / 1_000)}K` : value; }
function SmallMetric({ label, value, icon: Icon, path, alert }) { return <Link to={path} className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className={`h-4 w-4 ${alert ? 'text-amber-600' : 'text-primary'}`} /></div><p className="mt-2 text-2xl font-bold">{value}</p></Link>; }
function Panel({ title, path, icon: Icon, children }) { return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="flex items-center gap-2 font-heading font-semibold">{Icon && <Icon className="h-4 w-4 text-amber-600" />}{title}</h2><Link to={path} className="flex items-center gap-1 text-xs font-semibold text-primary">View all <ArrowRight className="h-3 w-3" /></Link></div>{children}</section>; }
function Empty({ label, success }) { return <div className="p-8 text-center text-sm text-muted-foreground">{success && <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />}{label}</div>; }
function OperatingStat({ label, value, icon: Icon, path }) { return <Link to={path} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span><span><span className="block text-xs text-muted-foreground">{label}</span><strong className="text-sm">{value}</strong></span></Link>; }
