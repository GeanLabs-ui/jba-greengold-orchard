import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';

const orderFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'order_date', label: 'Order Date', type: 'date', required: true },
  {
    name: 'source',
    label: 'Source',
    type: 'select',
    defaultValue: 'manual',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'portal', label: 'Customer Portal' },
      { value: 'phone', label: 'Phone' },
      { value: 'walk_in', label: 'Walk-in' },
    ],
  },
  { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'draft',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'dispatched', label: 'Dispatched' },
      { value: 'delivered', label: 'Delivered' },
    ],
  },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    base44.entities.Order.list('-order_date')
      .then((d) => { setOrders(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createOrder = (payload) => base44.entities.Order.create({
    ...payload,
    order_number: `ORD-${Date.now().toString().slice(-6)}`,
  });

  const filtered = orders.filter((o) => !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()));

  const statusCounts = {
    draft: orders.filter((o) => o.status === 'draft').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    dispatched: orders.filter((o) => o.status === 'dispatched').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  return (
    <div>
      <PageHeader title="Order Management" description="Track orders from creation through fulfillment.">
        <AdminCreateDialog
          title="New Order"
          description="Create a customer order and add it to the order pipeline."
          buttonLabel="New Order"
          fields={orderFields}
          onCreate={createOrder}
          onCreated={load}
          submitLabel="Create Order"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Draft', value: statusCounts.draft, color: 'bg-slate-100 text-slate-700' },
          { label: 'Confirmed', value: statusCounts.confirmed, color: 'bg-blue-100 text-blue-700' },
          { label: 'Dispatched', value: statusCounts.dispatched, color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Delivered', value: statusCounts.delivered, color: 'bg-emerald-100 text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</div>
            <p className="mt-2 font-heading text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Order #</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length > 0 ? filtered.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(order.order_date)}</td>
                  <td className="px-4 py-3"><span className="capitalize">{order.source?.replace('_', ' ') || '—'}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
