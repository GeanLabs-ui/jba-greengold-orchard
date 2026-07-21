import React, { useEffect, useState } from 'react';
import { FileText, Receipt, CreditCard, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { base44 } from '@/api/base44Client';

const invoiceFields = [
  { name: 'customer_name', label: 'Customer', required: true },
  { name: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date' },
  { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'unpaid',
    options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid', label: 'Paid' },
    ],
  },
];

export default function Sales() {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);

  const load = () => {
    base44.entities.Invoice.list('-invoice_date', 50).then((d) => setInvoices(d || [])).catch(() => {});
    base44.entities.Quotation.list('-quote_date', 50).then((d) => setQuotations(d || [])).catch(() => {});
    base44.entities.Payment.list('-payment_date', 50).then((d) => setPayments(d || [])).catch(() => {});
    base44.entities.Return.list('-return_date', 50).then((d) => setReturns(d || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const createInvoice = (payload) => base44.entities.Invoice.create({
    ...payload,
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    balance_due: payload.status === 'paid' ? 0 : payload.total_amount,
  });

  const totalOutstanding = invoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + (i.balance_due || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Sales Management" description="Quotations, invoices, payments, receipts, and returns.">
        <AdminCreateDialog
          title="New Invoice"
          description="Create an invoice and add it to sales tracking."
          buttonLabel="New Invoice"
          fields={invoiceFields}
          onCreate={createInvoice}
          onCreated={load}
          submitLabel="Create Invoice"
        />
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /><span className="text-sm">Invoices</span></div>
          <p className="mt-2 font-heading text-2xl font-bold">{invoices.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-4 w-4" /><span className="text-sm">Outstanding</span></div>
          <p className="mt-2 font-heading text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Receipt className="h-4 w-4" /><span className="text-sm">Payments Received</span></div>
          <p className="mt-2 font-heading text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><RotateCcw className="h-4 w-4" /><span className="text-sm">Returns</span></div>
          <p className="mt-2 font-heading text-2xl font-bold">{returns.length}</p>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <DataTable items={invoices} columns={[
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_date', label: 'Date', format: formatDate },
            { key: 'due_date', label: 'Due', format: formatDate },
            { key: 'total_amount', label: 'Total', format: (v) => formatCurrency(v) },
            { key: 'balance_due', label: 'Balance', format: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]} />
        </TabsContent>

        <TabsContent value="quotations" className="mt-4">
          <DataTable items={quotations} columns={[
            { key: 'quote_number', label: 'Quote #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'quote_date', label: 'Date', format: formatDate },
            { key: 'valid_until', label: 'Valid Until', format: formatDate },
            { key: 'total_amount', label: 'Total', format: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <DataTable items={payments} columns={[
            { key: 'payment_reference', label: 'Reference' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_number', label: 'Invoice' },
            { key: 'payment_method', label: 'Method' },
            { key: 'amount', label: 'Amount', format: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]} />
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          <DataTable items={returns} columns={[
            { key: 'return_number', label: 'Return #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_number', label: 'Invoice' },
            { key: 'return_date', label: 'Date', format: formatDate },
            { key: 'total_amount', label: 'Amount', format: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DataTable({ items, columns }) {
  if (!items || items.length === 0) {
    return <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">No records found.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground">{col.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, i) => (
            <tr key={item.id || i} className="hover:bg-muted/30 transition-colors">
              {columns.map((col) => {
                const val = item[col.key];
                return (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(val) : col.format ? col.format(val) : val || '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
