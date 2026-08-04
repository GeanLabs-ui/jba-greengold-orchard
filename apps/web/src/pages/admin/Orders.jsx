import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Globe2, Loader2, PackageCheck, Search, Truck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Input } from '@/components/ui/input';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const orderFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'order_date', label: 'Order Date', type: 'date', required: true },
  {
    name: 'source', label: 'Source', type: 'select', defaultValue: 'manual', options: [
      { value: 'manual', label: 'Manual' }, { value: 'website', label: 'Website' },
      { value: 'portal', label: 'Customer Portal' }, { value: 'phone', label: 'Phone' },
      { value: 'walk_in', label: 'Walk-in' },
    ],
  },
  { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
  { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: statusOptions },
];

const statusCopy = {
  confirmed: ['Order confirmed', 'Your order has been confirmed by our team.'],
  processing: ['Order processing', 'The fulfillment team is preparing your order.'],
  packed: ['Order packed', 'Your order has been packed and is ready for dispatch.'],
  dispatched: ['Order dispatched', 'Your order is on the way.'],
  delivered: ['Order delivered', 'Your order has been marked as delivered.'],
  cancelled: ['Order cancelled', 'This order was cancelled by the fulfillment team.'],
  draft: ['Order moved to draft', 'The order requires review before fulfillment.'],
};

const displayDateTime = (value) => value ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    base44.entities.Order.list('-order_date', 250)
      .then((data) => {
        const nextOrders = data || [];
        setOrders(nextOrders);
        const requestedId = searchParams.get('order');
        if (requestedId && nextOrders.some((order) => order.id === requestedId)) setExpandedId(requestedId);
      })
      .catch((loadError) => setError(loadError.message || 'Orders could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['Order', 'Invoice', 'Delivery']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const createOrder = async (payload) => {
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const order = await base44.entities.Order.create({
      ...payload,
      order_number: orderNumber,
      currency: 'GHS',
      payment_status: 'pending',
      status_history: [{ status: payload.status, label: statusCopy[payload.status]?.[0] || 'Order created', timestamp: new Date().toISOString(), note: 'Created by the admin team.' }],
    });
    if (payload.status !== 'draft' && payload.status !== 'cancelled') {
      await base44.entities.Invoice.create({
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        order_id: order.id,
        order_number: orderNumber,
        customer_name: payload.customer_name,
        invoice_date: payload.order_date,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        source: payload.source,
        currency: 'GHS',
        total_amount: payload.total_amount,
        amount_paid: 0,
        balance_due: payload.total_amount,
        status: 'unpaid',
      });
    }
    return order;
  };

  const updateStatus = async (order, status) => {
    if (status === order.status) return;
    setUpdatingId(order.id);
    setError('');
    const [label, note] = statusCopy[status] || [status, 'Order status updated.'];
    const timestamp = new Date().toISOString();
    const statusHistory = [...(order.status_history || []), { status, label, timestamp, note }];
    try {
      const updated = await base44.entities.Order.update(order.id, { status, status_history: statusHistory });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated, status, status_history: statusHistory } : item));
      if (status === 'dispatched' || status === 'delivered') {
        const existing = await base44.entities.Delivery.filter({ order_number: order.order_number }, '-created_date', 1);
        if (existing[0]) {
          await base44.entities.Delivery.update(existing[0].id, { status: status === 'delivered' ? 'delivered' : 'in_transit', delivery_date: status === 'delivered' ? timestamp : existing[0].delivery_date });
        } else if (status === 'dispatched') {
          await base44.entities.Delivery.create({
            delivery_code: `DEL-${Date.now().toString().slice(-6)}`,
            order_id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            dispatch_date: timestamp,
            status: 'in_transit',
            shipping_address: order.shipping_address,
          });
        }
      }
      if (status === 'cancelled') {
        const relatedInvoices = await base44.entities.Invoice.filter({ order_number: order.order_number }, '-created_date', 10);
        await Promise.all(relatedInvoices.filter((invoice) => invoice.status !== 'paid').map((invoice) => base44.entities.Invoice.update(invoice.id, { status: 'void', balance_due: 0 })));
      }
    } catch (updateError) {
      setError(updateError.message || 'The order status could not be updated.');
    } finally {
      setUpdatingId('');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => !term || [order.order_number, order.customer_name, order.contact_email, order.contact_phone].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [orders, search]);

  const counts = {
    new: orders.filter((order) => ['confirmed', 'draft'].includes(order.status)).length,
    fulfillment: orders.filter((order) => ['processing', 'packed'].includes(order.status)).length,
    dispatched: orders.filter((order) => order.status === 'dispatched').length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
  };

  return (
    <div>
      <PageHeader title="Orders" description="Website and staff-created orders, fulfillment status, and delivery progress in one place.">
        <AdminCreateDialog title="New Order" description="Create a customer order and add it to the fulfillment pipeline." buttonLabel="New Order" fields={orderFields} onCreate={createOrder} onCreated={load} submitLabel="Create Order" />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'New orders', value: counts.new, color: 'bg-blue-100 text-blue-700' },
          { label: 'In fulfillment', value: counts.fulfillment, color: 'bg-amber-100 text-amber-700' },
          { label: 'Dispatched', value: counts.dispatched, color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Delivered', value: counts.delivered, color: 'bg-emerald-100 text-emerald-700' },
        ].map((summary) => (
          <div key={summary.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${summary.color}`}>{summary.label}</div>
            <p className="mt-2 font-heading text-2xl font-bold">{summary.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search order, customer, email or phone..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">{orders.filter((order) => order.source === 'website').length} website orders</p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[920px] text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="w-12 px-3 py-3" aria-label="Order details" />
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fulfillment status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.length ? filtered.map((order) => (
                <Fragment key={order.id}>
                  <tr className="transition-colors hover:bg-muted/30">
                    <td className="px-3 py-3"><button type="button" onClick={() => setExpandedId((current) => current === order.id ? '' : order.id)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted" aria-label={`${expandedId === order.id ? 'Hide' : 'Show'} ${order.order_number} details`}>{expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button></td>
                    <td className="px-4 py-3"><p className="font-semibold">{order.order_number}</p>{order.item_count ? <p className="mt-0.5 text-xs text-muted-foreground">{order.item_count} items</p> : null}</td>
                    <td className="px-4 py-3"><p>{order.customer_name}</p>{order.contact_phone ? <p className="mt-0.5 text-xs text-muted-foreground">{order.contact_phone}</p> : null}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.order_date)}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 capitalize">{order.source === 'website' ? <Globe2 className="h-3.5 w-3.5 text-emerald-700" /> : null}{order.source?.replace('_', ' ') || '—'}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <select value={order.status || 'draft'} onChange={(event) => updateStatus(order, event.target.value)} disabled={updatingId === order.id} className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
                          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr className="bg-muted/20"><td colSpan={7} className="px-6 py-6">
                      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr]">
                        <div><h3 className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground"><PackageCheck className="mr-2 h-4 w-4" /> Products</h3>
                          <div className="mt-3 space-y-2">{order.items?.length ? order.items.map((item) => <div key={`${order.id}-${item.product_id}`} className="flex justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"><span><span className="font-medium">{item.product_name}</span><span className="ml-2 text-xs text-muted-foreground">× {item.quantity}</span></span><span className="font-medium">{formatCurrency(item.line_total)}</span></div>) : <p className="text-sm text-muted-foreground">No line items recorded for this order.</p>}</div>
                        </div>
                        <div><h3 className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground"><Truck className="mr-2 h-4 w-4" /> Delivery and payment</h3>
                          <div className="mt-3 space-y-1 text-sm"><p className="font-medium">{order.shipping_address?.full_name || order.customer_name}</p><p>{order.shipping_address?.address || 'Address not recorded'}</p><p>{[order.shipping_address?.city, order.shipping_address?.region].filter(Boolean).join(', ')}</p><p className="pt-2 text-muted-foreground">{order.contact_email}</p><p className="text-muted-foreground">{order.contact_phone}</p><p className="pt-2 capitalize">Payment: {String(order.payment_method || 'not recorded').replaceAll('_', ' ')}</p></div>
                        </div>
                        <div><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer-visible history</h3>
                          <div className="mt-3 max-h-48 space-y-3 overflow-auto">{order.status_history?.length ? [...order.status_history].reverse().map((entry, index) => <div key={`${entry.timestamp}-${index}`} className="border-l-2 border-emerald-700 pl-3"><p className="text-sm font-medium">{entry.label || entry.status}</p><p className="text-xs text-muted-foreground">{displayDateTime(entry.timestamp)}</p><p className="mt-1 text-xs text-muted-foreground">{entry.note}</p></div>) : <p className="text-sm text-muted-foreground">Status updates will appear here.</p>}</div>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              )) : <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
