import React, { useEffect, useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import PageSkeleton from '@/components/shared/PageSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';

export default function PortalPayments() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-invoice_date', 50),
      base44.entities.Payment.list('-payment_date', 50),
    ]).then(([invs, pays]) => {
      setInvoices(invs || []);
      setPayments(pays || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Payments & Invoices" description="View your invoices, payment history, and outstanding balances." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard title="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} color="red" />
        <MetricCard title="Total Paid" value={formatCurrency(totalPaid)} icon={CreditCard} color="green" />
        <MetricCard title="Total Invoices" value={String(invoices.length)} icon={CreditCard} color="blue" />
      </div>
      <Tabs defaultValue="invoices">
        <TabsList><TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="payments">Payment History</TabsTrigger></TabsList>
        <TabsContent value="invoices" className="mt-4">
          {loading ? <PageSkeleton contentOnly /> : (
            <DataTable items={invoices} columns={[
              { key: 'invoice_number', label: 'Invoice #' },
              { key: 'invoice_date', label: 'Date', format: formatDate },
              { key: 'due_date', label: 'Due', format: formatDate },
              { key: 'total_amount', label: 'Total', align: 'right', format: (v) => formatCurrency(v) },
              { key: 'balance_due', label: 'Balance', align: 'right', format: (v) => formatCurrency(v) },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {loading ? <PageSkeleton contentOnly /> : (
            <DataTable items={payments} columns={[
              { key: 'payment_reference', label: 'Reference' },
              { key: 'invoice_number', label: 'Invoice' },
              { key: 'payment_method', label: 'Method' },
              { key: 'payment_date', label: 'Date', format: formatDate },
              { key: 'amount', label: 'Amount', align: 'right', format: (v) => formatCurrency(v) },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
