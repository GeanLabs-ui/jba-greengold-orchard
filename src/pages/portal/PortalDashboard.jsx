import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, CreditCard, FileText, Wallet, ArrowRight, Package, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { base44 } from '@/api/base44Client';

export default function PortalDashboard() {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-order_date', 5).catch(() => []),
      base44.entities.Invoice.filter({ status: 'unpaid' }, '-invoice_date', 5).catch(() => []),
    ]).then(([ords, invs]) => {
      setOrders(ords || []);
      setInvoices(invs || []);
      setLoading(false);
    });
  }, []);

  const outstanding = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  return (
    <div>
      <PageHeader title="Welcome Back!" description="Here's an overview of your account and recent activity." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Active Orders" value={String(orders.length)} icon={ShoppingCart} color="primary" />
        <MetricCard title="Outstanding Balance" value={formatCurrency(outstanding)} icon={Wallet} color="red" />
        <MetricCard title="Pending Invoices" value={String(invoices.length)} icon={CreditCard} color="amber" />
        <MetricCard title="Documents" value="—" icon={FileText} color="blue" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-heading font-semibold">Recent Orders</h3>
            <Link to="/portal/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-border">
            {orders.length > 0 ? orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
                  <div><p className="font-medium text-sm">{order.order_number}</p><p className="text-xs text-muted-foreground">{formatDate(order.order_date)}</p></div>
                </div>
                <div className="text-right"><p className="font-semibold text-sm">{formatCurrency(order.total_amount)}</p><StatusBadge status={order.status} /></div>
              </div>
            )) : <div className="p-8 text-center text-sm text-muted-foreground">No orders yet.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-heading font-semibold">Pending Invoices</h3>
            <Link to="/portal/payments" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-border">
            {invoices.length > 0 ? invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div><p className="font-medium text-sm">{inv.invoice_number}</p><p className="text-xs text-muted-foreground">Due {formatDate(inv.due_date)}</p></div>
                <div className="text-right"><p className="font-semibold text-sm text-red-600">{formatCurrency(inv.balance_due)}</p><StatusBadge status={inv.status} /></div>
              </div>
            )) : <div className="p-8 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />All invoices are paid!</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Package, title: 'Track Orders', desc: 'View order status and delivery progress', path: '/portal/orders' },
          { icon: CreditCard, title: 'Make Payment', desc: 'View invoices and payment history', path: '/portal/payments' },
          { icon: FileText, title: 'Download Documents', desc: 'Access invoices, receipts, and statements', path: '/portal/documents' },
        ].map((item) => (
          <Link key={item.title} to={item.path} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><item.icon className="h-5 w-5 text-primary" /></div>
            <h4 className="mt-3 font-semibold">{item.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
