import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import MetricCard from '@/components/shared/MetricCard';
import AdminCreateDialog from '@/components/admin/AdminCreateDialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';

const expenseFields = [
  { name: 'category', label: 'Category', required: true },
  { name: 'vendor_name', label: 'Vendor' },
  { name: 'expense_date', label: 'Expense Date', type: 'date', required: true },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'pending',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'paid', label: 'Paid' },
    ],
  },
];

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Invoice.list('-invoice_date', 50),
      base44.entities.Payment.list('-payment_date', 50),
      base44.entities.Expense.list('-expense_date', 50),
      base44.entities.FarmExpense.list('-expense_date', 250),
      base44.entities.FarmFinanceRecord.list('-record_date', 250),
    ]).then(([invs, pays, exps, farmExps, records]) => {
      setInvoices(invs || []);
      setPayments(pays || []);
      setExpenses([
        ...(exps || []),
        ...(farmExps || []).map((expense) => ({
          ...expense,
          expense_number: expense.expense_number || expense.expense_code,
          vendor_name: expense.vendor_name || expense.vendor,
        })),
      ]);
      setFinanceRecords(records || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    }, ['Invoice', 'Payment', 'Expense', 'FarmExpense', 'FarmFinanceRecord']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const createExpense = (payload) => base44.entities.Expense.create({
    ...payload,
    expense_number: `EXP-${Date.now().toString().slice(-6)}`,
  });

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.balance_due || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const businessTargets = financeRecords.filter((record) => record.record_type === 'business_target');
  const harvestReconciliation = financeRecords.find((record) => record.record_type === 'harvest_reconciliation');
  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const inMonth = (value) => {
      const current = new Date(value);
      return current.getFullYear() === date.getFullYear() && current.getMonth() === date.getMonth();
    };
    return {
      month: date.toLocaleDateString('en-GH', { month: 'short' }),
      revenue: payments.filter((payment) => inMonth(payment.payment_date || payment.created_date)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      expenses: expenses.filter((expense) => inMonth(expense.expense_date || expense.created_date)).reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    };
  }), [payments, expenses]);

  return (
    <div>
      <PageHeader title="Finance" description="Revenue, expenses, payments, and financial summaries.">
        <AdminCreateDialog
          title="Record Expense"
          description="Add an expense to finance tracking."
          buttonLabel="Record Expense"
          fields={expenseFields}
          onCreate={createExpense}
          onCreated={load}
          submitLabel="Record Expense"
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="green" subtitle="From payments" />
        <MetricCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" subtitle="Recorded" />
        <MetricCard title="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} color="amber" subtitle="Unpaid invoices" />
        <MetricCard title="Net Profit" value={formatCurrency(netProfit)} icon={Banknote} color={netProfit >= 0 ? 'green' : 'red'} subtitle="Revenue - Expenses" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-heading font-semibold">Revenue vs Expenses (GHS)</h3>
        <ResponsiveContainer width="100%" height={280} className="mt-4">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
            <Bar dataKey="revenue" fill="hsl(150 45% 42%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(businessTargets.length > 0 || harvestReconciliation) && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          {businessTargets.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-heading font-semibold">Workbook growth targets</h3>
              <p className="mb-4 text-xs text-muted-foreground">Targets imported from the 2026–2030 plan in the farm records workbook.</p>
              <DataTable items={businessTargets} columns={[
                { key: 'category', label: 'Area' },
                { key: 'target_2026', label: '2026', align: 'right', render: formatTarget },
                { key: 'target_2027', label: '2027', align: 'right', render: formatTarget },
                { key: 'target_2028', label: '2028', align: 'right', render: formatTarget },
                { key: 'target_2029', label: '2029', align: 'right', render: formatTarget },
                { key: 'target_2030', label: '2030', align: 'right', render: formatTarget },
              ]} />
            </section>
          )}
          {harvestReconciliation && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-heading font-semibold">Harvest reconciliation</h3>
              <p className="text-xs text-muted-foreground">Imported 2026 workbook totals.</p>
              <dl className="mt-4 space-y-3 text-sm">
                <FinanceLine label="Projected gross" value={harvestReconciliation.projected_gross} />
                <FinanceLine label="Harvest cost" value={harvestReconciliation.harvest_cost} />
                <FinanceLine label="Net projected" value={harvestReconciliation.net_projected} />
                <FinanceLine label="Receipts recorded" value={harvestReconciliation.total_receipts} />
                <FinanceLine label="Buyer deductions" value={harvestReconciliation.buyer_deductions} />
              </dl>
            </section>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 font-heading font-semibold">Recent Expenses</h3>
        {loading ? <div className="h-48 animate-pulse rounded-xl bg-muted" /> : (
          <DataTable items={expenses} columns={[
            { key: 'expense_number', label: 'Expense #' },
            { key: 'category', label: 'Category' },
            { key: 'expense_date', label: 'Date', format: formatDate },
            { key: 'vendor_name', label: 'Vendor' },
            { key: 'amount', label: 'Amount', align: 'right', format: (v) => formatCurrency(v) },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          ]} />
        )}
      </div>
    </div>
  );
}

function formatTarget(value, record) {
  return record?.category === 'FARM' ? formatCurrency(value) : Number(value || 0).toLocaleString('en-GH');
}

function FinanceLine({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{formatCurrency(value)}</dd></div>;
}
