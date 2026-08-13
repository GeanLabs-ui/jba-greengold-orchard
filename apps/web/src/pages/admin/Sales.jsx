import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banknote, CreditCard, Globe2, Receipt, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const invoiceFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date' },
  { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
  {
    name: 'status', label: 'Status', type: 'select', defaultValue: 'unpaid', options: [
      { value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' },
    ],
  },
];

const successfulOrder = (order) => order.status !== 'cancelled' && order.status !== 'draft';

export default function Sales() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('invoice') ? 'invoices' : 'orders');
  const [records, setRecords] = useState({ orders: [], invoices: [], quotations: [], payments: [], returns: [] });
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Order.list('-order_date', 250),
      base44.entities.Invoice.list('-invoice_date', 250),
      base44.entities.Quotation.list('-quote_date', 100),
      base44.entities.Payment.list('-payment_date', 250),
      base44.entities.Return.list('-return_date', 100),
    ]).then(([orders, invoices, quotations, payments, returns]) => {
      setRecords({ orders: orders || [], invoices: invoices || [], quotations: quotations || [], payments: payments || [], returns: returns || [] });
    }).catch((error) => toast({ title: 'Sales data could not be loaded', description: error.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['Order', 'Invoice', 'Payment', 'Quotation', 'Return']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (searchParams.get('invoice')) setActiveTab('invoices');
  }, [searchParams]);

  const createInvoice = async (payload) => {
    const invoice = await base44.entities.Invoice.create({
      ...payload,
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      amount_paid: payload.status === 'paid' ? payload.total_amount : 0,
      balance_due: payload.status === 'paid' ? 0 : payload.total_amount,
      currency: 'GHS',
      source: 'admin',
    });
    if (payload.status === 'paid') {
      await base44.entities.Payment.create({
        payment_reference: `PAY-${Date.now().toString().slice(-6)}`,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        payment_date: new Date().toISOString(),
        payment_method: 'manual',
        amount: invoice.total_amount,
        currency: 'GHS',
        status: 'completed',
      });
    }
    return invoice;
  };

  const recordPayment = async (invoice) => {
    const amount = Number(invoice.balance_due ?? invoice.total_amount ?? 0);
    if (!amount || invoice.status === 'paid') return;
    setPayingId(invoice.id);
    try {
      await base44.entities.Payment.create({
        payment_reference: `PAY-${Date.now().toString().slice(-6)}`,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        order_number: invoice.order_number,
        customer_name: invoice.customer_name,
        payment_date: new Date().toISOString(),
        payment_method: invoice.payment_method || 'manual',
        amount,
        currency: invoice.currency || 'GHS',
        status: 'completed',
      });
      await base44.entities.Invoice.update(invoice.id, { status: 'paid', amount_paid: Number(invoice.total_amount || amount), balance_due: 0, paid_date: new Date().toISOString() });
      if (invoice.order_id) await base44.entities.Order.update(invoice.order_id, { payment_status: 'paid' });
      toast({ title: `${invoice.invoice_number} marked paid`, description: 'Finance, Orders, and Dashboard have been updated.' });
      load();
    } catch (error) {
      toast({ title: 'Payment could not be recorded', description: error.message, variant: 'destructive' });
    } finally {
      setPayingId('');
    }
  };

  const orders = records.orders.filter(successfulOrder);
  const grossSales = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const websiteSales = orders.filter((order) => order.source === 'website').reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalPaid = records.payments.filter((payment) => payment.status !== 'failed').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalOutstanding = records.invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.balance_due ?? invoice.total_amount ?? 0), 0);
  const invoiceByOrder = useMemo(() => new Map(records.invoices.map((invoice) => [invoice.order_number, invoice])), [records.invoices]);

  return (
    <div>
      <PageHeader>
        <AdminCreateDialog title="New Invoice" description="Create an invoice and add it to Sales and Finance." buttonLabel="New Invoice" fields={invoiceFields} onCreate={createInvoice} onCreated={load} submitLabel="Create Invoice" />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={ShoppingBag} label="Gross sales" value={formatCurrency(grossSales)} />
        <Summary icon={Globe2} label="Website sales" value={formatCurrency(websiteSales)} />
        <Summary icon={Receipt} label="Payments received" value={formatCurrency(totalPaid)} tone="text-emerald-700" />
        <Summary icon={CreditCard} label="Outstanding" value={formatCurrency(totalOutstanding)} tone="text-amber-700" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="orders">Sales orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({records.invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({records.payments.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4"><SalesOrdersTable orders={orders} invoiceByOrder={invoiceByOrder} loading={loading} /></TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <DataTable items={records.invoices} columns={[
            { key: 'invoice_number', label: 'Invoice' }, { key: 'order_number', label: 'Order' }, { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_date', label: 'Date', format: formatDate }, { key: 'total_amount', label: 'Total', format: formatCurrency },
            { key: 'balance_due', label: 'Balance', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            { key: 'action', label: '', render: (_value, invoice) => invoice.status !== 'paid' ? <Button size="sm" variant="outline" disabled={payingId === invoice.id} onClick={() => recordPayment(invoice)}><Banknote className="mr-1.5 h-3.5 w-3.5" />{payingId === invoice.id ? 'Saving…' : 'Record paid'}</Button> : null },
          ]} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4"><DataTable items={records.payments} columns={[
          { key: 'payment_reference', label: 'Reference' }, { key: 'order_number', label: 'Order' }, { key: 'invoice_number', label: 'Invoice' },
          { key: 'customer_name', label: 'Customer' }, { key: 'payment_date', label: 'Date', format: formatDate },
          { key: 'payment_method', label: 'Method', format: humanize }, { key: 'amount', label: 'Amount', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        ]} /></TabsContent>
        <TabsContent value="quotations" className="mt-4"><DataTable items={records.quotations} columns={[
          { key: 'quote_number', label: 'Quote' }, { key: 'customer_name', label: 'Customer' }, { key: 'quote_date', label: 'Date', format: formatDate },
          { key: 'valid_until', label: 'Valid until', format: formatDate }, { key: 'total_amount', label: 'Total', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        ]} /></TabsContent>
        <TabsContent value="returns" className="mt-4"><DataTable items={records.returns} columns={[
          { key: 'return_number', label: 'Return' }, { key: 'order_number', label: 'Order' }, { key: 'customer_name', label: 'Customer' },
          { key: 'return_date', label: 'Date', format: formatDate }, { key: 'total_amount', label: 'Amount', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
        ]} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = '' }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className={`mt-2 font-heading text-2xl font-bold ${tone}`}>{value}</p></div>;
}

function SalesOrdersTable({ orders, invoiceByOrder, loading }) {
  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (!orders.length) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[1000px] text-sm"><thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
        <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer & contact</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th>
      </tr></thead><tbody className="divide-y divide-border">{orders.map((order) => {
        const invoice = invoiceByOrder.get(order.order_number);
        return <tr key={order.id} className="align-top hover:bg-muted/20">
          <td className="px-4 py-3"><p className="font-semibold">{order.order_number}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(order.order_date)}</p>{invoice && <p className="mt-1 text-xs text-primary">{invoice.invoice_number}</p>}</td>
          <td className="px-4 py-3"><p className="font-medium">{order.customer_name}</p><p className="mt-1 text-xs text-muted-foreground">{order.contact_email || order.customer_email || 'No email'}</p><p className="text-xs text-muted-foreground">{order.contact_phone || 'No phone'}</p></td>
          <td className="max-w-xs px-4 py-3">{order.items?.length ? order.items.map((item) => <p key={`${order.id}-${item.product_id}`} className="text-xs"><span className="font-medium">{item.product_name}</span> × {item.quantity}</p>) : <span className="text-muted-foreground">{order.item_count || 0} items</span>}</td>
          <td className="px-4 py-3 capitalize">{humanize(order.source)}</td><td className="px-4 py-3"><StatusBadge status={order.payment_status || invoice?.status || 'pending'} /><p className="mt-1 text-xs capitalize text-muted-foreground">{humanize(order.payment_method)}</p></td>
          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.total_amount)}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td>
        </tr>;
      })}</tbody></table>
    </div>
  );
}

function humanize(value) { return String(value || '—').replaceAll('_', ' '); }
function Empty() { return <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">No records found.</div>; }
function DataTable({ items, columns }) {
  if (!items?.length) return <Empty />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b bg-muted/50">{columns.map((column) => <th key={column.key} className="px-4 py-3 text-left font-semibold text-muted-foreground">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id} className="hover:bg-muted/30">{columns.map((column) => { const value = item[column.key]; return <td key={column.key} className="px-4 py-3">{column.render ? column.render(value, item) : column.format ? column.format(value) : value || '—'}</td>; })}</tr>)}</tbody></table></div>;
}
