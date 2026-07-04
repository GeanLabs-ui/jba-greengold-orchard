import React, { useEffect, useState } from 'react';
import { Plus, Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/components/shared/format';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable';
import MetricCard from '@/components/shared/MetricCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';

const monthlyData = [
  { month: 'Jan', revenue: 42, expenses: 28 },
  { month: 'Feb', revenue: 55, expenses: 32 },
  { month: 'Mar', revenue: 48, expenses: 30 },
  { month: 'Apr', revenue: 67, expenses: 38 },
  { month: 'May', revenue: 79, expenses: 42 },
  { month: 'Jun', revenue: 92, expenses: 48 },
];

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-invoice_date', 50),
      base44.entities.Payment.list('-payment_date', 50),
      base44.entities.Expense.list('-expense_date', 50),
    ]).then(([invs, pays, exps]) => {
      setInvoices(invs || []);
      setPayments(pays || []);
      setExpenses(exps || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.balance_due || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div>
      <PageHeader title="Finance" description="Revenue, expenses, payments, and financial summaries.">
        <Button className="gradient-mango text-white"><Plus className="mr-2 h-4 w-4" /> Record Expense</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="green" subtitle="From payments" />
        <MetricCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" subtitle="Recorded" />
        <MetricCard title="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} color="amber" subtitle="Unpaid invoices" />
        <MetricCard title="Net Profit" value={formatCurrency(netProfit)} icon={Banknote} color={netProfit >= 0 ? 'green' : 'red'} subtitle="Revenue - Expenses" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-heading font-semibold">Revenue vs Expenses (GHS M)</h3>
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