import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banknote, CreditCard, Globe2, Receipt, ShoppingBag } from 'lucide-react';
import PageSkeleton from '@/components/shared/PageSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency as formatCurrencyValue, formatDate } from '@/components/shared/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import EntityRecordActions from '@/components/admin/EntityRecordActions';
import { useAuth } from '@/lib/AuthContext';
import { canCorrectEntity } from '@/lib/record-actions';
import { orderFields, invoiceFields, paymentFields, quotationFields, returnFields, paymentEditFields, salesDeleteDescription } from '@/lib/sales-record-fields';

const formatCurrency = value => formatCurrencyValue(value, 2);
const successfulOrder = (order) => order.status !== 'cancelled' && order.status !== 'draft';

export default function Sales() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('invoice') ? 'invoices' : 'orders');
  const [records, setRecords] = useState({ orders: [], invoices: [], quotations: [], payments: [], returns: [] });
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Order.listAll('-order_date'),
      base44.entities.Invoice.listAll('-invoice_date'),
      base44.entities.Quotation.listAll('-quote_date'),
      base44.entities.Payment.listAll('-payment_date'),
      base44.entities.Return.listAll('-return_date'),
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
      status: 'unpaid',
      amount_paid: 0,
      balance_due: payload.total_amount,
      currency: 'GHS',
      source: 'admin',
    });
    if (payload.status === 'paid') {
      await base44.entities.Payment.create({
        payment_reference: `PAY-${Date.now().toString().slice(-6)}`,
        invoice_id: invoice.id,
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
  const totalPaid = records.payments.filter((payment) => payment.status === 'completed').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalOutstanding = records.invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.balance_due ?? invoice.total_amount ?? 0), 0);
  const invoiceByOrder = useMemo(() => new Map(records.invoices.map((invoice) => [invoice.order_number, invoice])), [records.invoices]);

  const actionColumn = (entity, fields) => ({ key: 'actions', label: 'Actions', render: (_value, record) => <EntityRecordActions entity={entity} record={record} fields={typeof fields === 'function' ? fields(record) : fields} onChanged={load} deleteDescription={salesDeleteDescription} /> });
  const creation = activeTab === 'payments' ? { entity: 'Payment', title: 'New Payment', fields: [...paymentFields, { name: 'invoice_number', label: 'Invoice reference (optional)' }], create: payload => base44.entities.Payment.create({ ...payload, currency: 'GHS', payment_reference: `PAY-${crypto.randomUUID().slice(0, 8)}` }) }
    : activeTab === 'quotations' ? { entity: 'Quotation', title: 'New Quotation', fields: quotationFields, create: payload => base44.entities.Quotation.create({ ...payload, currency: 'GHS', quote_number: `QUO-${crypto.randomUUID().slice(0, 8)}` }) }
    : activeTab === 'returns' ? { entity: 'Return', title: 'New Return', fields: [...returnFields,{name:'order_number',label:'Order reference (optional)'}], create: payload => base44.entities.Return.create({ ...payload,currency:'GHS',return_number:`RET-${crypto.randomUUID().slice(0,8)}` }) }
    : { entity: 'Invoice', title: 'New Invoice', fields: invoiceFields, create: createInvoice };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div data-page-navigation className="mb-6 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)]">
        <TabsList className="h-auto min-w-0 max-w-full justify-start overflow-x-auto lg:col-start-2 lg:justify-self-center">
          <TabsTrigger value="orders">Sales orders ({records.orders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({records.invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({records.payments.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>
          <div className="justify-self-end">
        {canCorrectEntity(user, creation.entity) && <AdminCreateDialog key={creation.entity} title={creation.title} description="Enter the record details, review them, then save." buttonLabel={creation.title} fields={creation.fields} onCreate={creation.create} onCreated={load} submitLabel="Save" />}
          </div>
        </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={ShoppingBag} label="Gross sales" value={formatCurrency(grossSales)} />
        <Summary icon={Globe2} label="Website sales" value={formatCurrency(websiteSales)} />
        <Summary icon={Receipt} label="Payments received" value={formatCurrency(totalPaid)} tone="text-emerald-700" />
        <Summary icon={CreditCard} label="Outstanding" value={formatCurrency(totalOutstanding)} tone="text-amber-700" />
      </div>


        <TabsContent value="orders" className="mt-4"><SalesOrdersTable orders={records.orders} invoiceByOrder={invoiceByOrder} loading={loading} onChanged={load} /></TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <DataTable items={records.invoices} columns={[
            { key: 'invoice_number', label: 'Invoice' }, { key: 'order_number', label: 'Order' }, { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_date', label: 'Date', format: formatDate }, { key: 'total_amount', label: 'Total', format: formatCurrency },
            { key: 'balance_due', label: 'Balance', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            { key: 'action', label: '', render: (_value, invoice) => canCorrectEntity(user, 'Payment') && invoice.status !== 'paid' && !['void','cancelled','draft'].includes(invoice.status) ? <Button size="sm" variant="outline" disabled={payingId === invoice.id} onClick={() => recordPayment(invoice)}><Banknote className="mr-1.5 h-3.5 w-3.5" />{payingId === invoice.id ? 'Saving…' : 'Record paid'}</Button> : null },
            actionColumn('Invoice', invoiceFields),
          ]} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4"><DataTable items={records.payments} columns={[
          { key: 'payment_reference', label: 'Reference' }, { key: 'order_number', label: 'Order' }, { key: 'invoice_number', label: 'Invoice' },
          { key: 'customer_name', label: 'Customer' }, { key: 'payment_date', label: 'Date', format: formatDate },
          { key: 'payment_method', label: 'Method', format: humanize }, { key: 'amount', label: 'Amount', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          actionColumn('Payment', paymentEditFields),
        ]} /></TabsContent>
        <TabsContent value="quotations" className="mt-4"><DataTable items={records.quotations} columns={[
          { key: 'quote_number', label: 'Quote' }, { key: 'customer_name', label: 'Customer' }, { key: 'quote_date', label: 'Date', format: formatDate },
          { key: 'valid_until', label: 'Valid until', format: formatDate }, { key: 'total_amount', label: 'Total', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          actionColumn('Quotation', quotationFields),
        ]} /></TabsContent>
        <TabsContent value="returns" className="mt-4"><DataTable items={records.returns} columns={[
          { key: 'return_number', label: 'Return' }, { key: 'order_number', label: 'Order' }, { key: 'customer_name', label: 'Customer' },
          { key: 'return_date', label: 'Date', format: formatDate }, { key: 'total_amount', label: 'Amount', format: formatCurrency }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
          actionColumn('Return', returnFields),
        ]} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = '' }) {
  const semanticTone = /revenue|sales/i.test(label) ? 'text-blue-600' : tone;
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className={`flex items-center gap-2 text-sm ${semanticTone || 'text-muted-foreground'}`}><Icon className="h-4 w-4" />{label}</div><p className={`mt-2 font-heading text-2xl font-bold ${semanticTone}`}>{value}</p></div>;
}

function SalesOrdersTable({ orders, invoiceByOrder, loading, onChanged }) {
  if (loading) return <PageSkeleton contentOnly />;
  if (!orders.length) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[1000px] text-sm"><thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
        <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer & contact</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right text-blue-600">Revenue</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
      </tr></thead><tbody className="divide-y divide-border">{orders.map((order) => {
        const invoice = invoiceByOrder.get(order.order_number);
        return <tr key={order.id} className="align-top hover:bg-muted/20">
          <td className="px-4 py-3"><p className="font-semibold">{order.order_number}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(order.order_date)}</p>{invoice && <p className="mt-1 text-xs text-primary">{invoice.invoice_number}</p>}</td>
          <td className="px-4 py-3"><p className="font-medium">{order.customer_name}</p><p className="mt-1 text-xs text-muted-foreground">{order.contact_email || order.customer_email || 'No email'}</p><p className="text-xs text-muted-foreground">{order.contact_phone || 'No phone'}</p></td>
          <td className="max-w-xs px-4 py-3">{order.items?.length ? order.items.map((item) => <p key={`${order.id}-${item.product_id}`} className="text-xs"><span className="font-medium">{item.product_name}</span> × {item.quantity}</p>) : <span className="text-muted-foreground">{order.item_count || 0} items</span>}</td>
          <td className="px-4 py-3 capitalize">{humanize(order.source)}</td><td className="px-4 py-3"><StatusBadge status={order.payment_status || invoice?.status || 'pending'} /><p className="mt-1 text-xs capitalize text-muted-foreground">{humanize(order.payment_method)}</p></td>
          <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatCurrency(order.total_amount)}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td>
          <td className="px-4 py-3"><EntityRecordActions entity="Order" record={order} fields={orderFields} onChanged={onChanged} deleteDescription={salesDeleteDescription} /></td>
        </tr>;
      })}</tbody></table>
    </div>
  );
}

function humanize(value) { return String(value || '—').replaceAll('_', ' '); }
function Empty() { return <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">No records found.</div>; }
function DataTable({ items, columns }) {
  if (!items?.length) return <Empty />;
  const toneFor = (column) => /total|amount|balance|revenue|sales/i.test(`${column.label} ${column.key}`) ? 'text-blue-600' : 'text-muted-foreground';
  return <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b bg-muted/50">{columns.map((column) => <th key={column.key} className={`px-4 py-3 text-left font-semibold ${toneFor(column)}`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id} className="hover:bg-muted/30">{columns.map((column) => { const value = item[column.key]; const semantic = /total|amount|balance|revenue|sales/i.test(`${column.label} ${column.key}`) ? 'text-blue-600 font-semibold' : ''; return <td key={column.key} className={`px-4 py-3 ${semantic}`}>{column.render ? column.render(value, item) : column.format ? column.format(value) : value || '—'}</td>; })}</tr>)}</tbody></table></div>;
}
