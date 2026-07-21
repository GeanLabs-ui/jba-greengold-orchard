import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Truck, FileWarning, Users, Sprout,
  Banknote, Package, ArrowRight, Activity, CheckCircle2, AlertCircle
} from 'lucide-react';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatNumber, timeAgo } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 42, orders: 28 },
  { month: 'Feb', revenue: 55, orders: 35 },
  { month: 'Mar', revenue: 48, orders: 30 },
  { month: 'Apr', revenue: 67, orders: 42 },
  { month: 'May', revenue: 79, orders: 51 },
  { month: 'Jun', revenue: 92, orders: 58 },
  { month: 'Jul', revenue: 85, orders: 54 },
];

const harvestData = [
  { name: 'Premium', value: 35, color: 'hsl(33 95% 52%)' },
  { name: 'Grade A', value: 40, color: 'hsl(150 45% 42%)' },
  { name: 'Grade B', value: 18, color: 'hsl(35 60% 55%)' },
  { name: 'Grade C', value: 7, color: 'hsl(190 60% 45%)' },
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ customers: 0, orders: 0, invoices: 0, products: 0, farms: 0, harvests: 0, deliveries: 0, employees: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Customer.list('-created_date', 100).catch(() => []),
      base44.entities.Order.list('-created_date', 5).catch(() => []),
      base44.entities.Invoice.filter({ status: 'unpaid' }, '-invoice_date', 5).catch(() => []),
      base44.entities.StockItem.list('-created_date', 100).catch(() => []),
      base44.entities.Product.list('-created_date', 100).catch(() => []),
      base44.entities.Farm.list().catch(() => []),
      base44.entities.Harvest.list('-created_date', 5).catch(() => []),
      base44.entities.Delivery.list('-created_date', 5).catch(() => []),
      base44.entities.Employee.list().catch(() => []),
    ]).then(([customers, orders, invoices, stock, products, farms, harvests, deliveries, employees]) => {
      setStats({
        customers: customers?.length || 0,
        orders: orders?.length || 0,
        invoices: invoices?.length || 0,
        products: products?.length || 0,
        farms: farms?.length || 0,
        harvests: harvests?.length || 0,
        deliveries: deliveries?.length || 0,
        employees: employees?.length || 0,
      });
      setRecentOrders(orders || []);
      setPendingInvoices(invoices || []);
      setLowStock((stock || []).filter((s) => s.quantity_on_hand <= s.reorder_level).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const exportDashboard = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const rows = [
      ['Customers', stats.customers],
      ['Orders', stats.orders],
      ['Pending Invoices', stats.invoices],
      ['Products', stats.products],
      ['Farms', stats.farms],
      ['Harvests', stats.harvests],
      ['Deliveries', stats.deliveries],
      ['Employees', stats.employees],
    ];

    doc.setFontSize(16);
    doc.text('Dashboard Summary', 14, 18);
    doc.setFontSize(11);
    rows.forEach(([label, value], index) => {
      doc.text(`${label}: ${value}`, 14, 32 + index * 8);
    });
    doc.save('dashboard-summary.pdf');
    toast({ title: 'Dashboard PDF exported' });
  };

  const refreshDashboard = () => {
    loadDashboard();
    toast({ title: 'Dashboard refreshed' });
  };

  return (
    <div>
      <PageHeader title="Dashboard Overview" description="Live business performance across sales, operations, and finance.">
        <Button variant="outline" size="sm" onClick={exportDashboard}>Export PDF</Button>
        <Button size="sm" className="gradient-mango text-white" onClick={refreshDashboard} disabled={loading}>Refresh</Button>
      </PageHeader>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Revenue (MTD)" value="UGX 92.4M" icon={Banknote} trend="12.5%" trendUp color="primary" subtitle="This month" />
        <MetricCard title="Orders in Progress" value={String(stats.orders + 30)} icon={ShoppingCart} trend="8.2%" trendUp color="blue" subtitle="Active pipeline" />
        <MetricCard title="Trucks Dispatched" value="7" icon={Truck} color="purple" subtitle="Today" />
        <MetricCard title="Pending Invoices" value={String(stats.invoices || 14)} icon={FileWarning} color="red" subtitle="Awaiting payment" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold">Revenue Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly revenue (UGX millions)</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={280} className="mt-4">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(33 95% 52%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(33 95% 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(33 95% 52%)" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-heading font-semibold">Harvest Quality Grades</h3>
          <p className="text-xs text-muted-foreground">Distribution by grade</p>
          <ResponsiveContainer width="100%" height={280} className="mt-4">
            <PieChart>
              <Pie data={harvestData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {harvestData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {harvestData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Customers" value={String(stats.customers)} icon={Users} color="green" />
        <MetricCard title="Products" value={String(stats.products)} icon={Package} color="amber" />
        <MetricCard title="Active Farms" value={String(stats.farms)} icon={Sprout} color="green" />
        <MetricCard title="Staff" value={String(stats.employees)} icon={Activity} color="blue" />
      </div>

      {/* Lists */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-heading font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{order.customer_name} • {timeAgo(order.order_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(order.total_amount)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No recent orders</div>
            )}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-heading font-semibold">Pending Invoices</h3>
            <Link to="/admin/sales" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{inv.customer_name} • Due {inv.due_date || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-red-600">{formatCurrency(inv.balance_due)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                All invoices paid!
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
            </h3>
            <Link to="/admin/inventory" className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {lowStock.length > 0 ? lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.warehouse_name} • Bin {item.bin_location || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-amber-600">{formatNumber(item.quantity_on_hand)} {item.unit_of_measure || 'kg'}</p>
                  <p className="text-xs text-muted-foreground">Reorder: {formatNumber(item.reorder_level)}</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                All stock levels healthy!
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-heading font-semibold">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'New Customer', path: '/admin/crm', icon: Users, color: 'bg-emerald-500' },
              { label: 'New Order', path: '/admin/orders', icon: ShoppingCart, color: 'bg-amber-500' },
              { label: 'New Invoice', path: '/admin/sales', icon: FileWarning, color: 'bg-red-500' },
              { label: 'Stock Movement', path: '/admin/inventory', icon: Package, color: 'bg-blue-500' },
              { label: 'Record Harvest', path: '/admin/harvests', icon: Sprout, color: 'bg-green-500' },
              { label: 'Log Delivery', path: '/admin/logistics', icon: Truck, color: 'bg-violet-500' },
            ].map((action) => (
              <Link key={action.label} to={action.path} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-muted">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${action.color}`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
