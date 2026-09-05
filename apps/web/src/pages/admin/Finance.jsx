import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Filter, MapPin, RotateCcw, TrendingDown, TrendingUp, Trash2, Wallet } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageSkeleton from '@/components/shared/PageSkeleton';
import { formatCurrency, formatDate } from '@/components/shared/format';
import DataTable from '@/components/shared/DataTable';
import MetricCard from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useAuth } from '@/lib/AuthContext';
import {
  activityExpenseRows,
  buildMonthlyFinanceData,
  matchesDateSelection,
  matchesFarmSelection,
  outstandingWebsiteInvoices,
  sumAmounts,
  websiteSales,
} from '@/lib/finance-data';

const canClearActivityCosts = (user) => (
  ['super_admin', 'admin', 'farm_manager'].includes(String(user?.role || '').trim().toLowerCase())
);

const yearOptions = Array.from({ length: 15 }, (_, index) => 2026 + index);
const today = new Date();
const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const initialYear = String(today.getFullYear());

const dateValue = (record, fields) => fields.map((field) => record?.[field]).find(Boolean);
const compactCedis = (value) => value >= 1_000_000 ? `₵${Math.round(value / 1_000_000)}M` : value >= 1_000 ? `₵${Math.round(value / 1_000)}K` : `₵${value}`;

const chartWindow = (selection, sales, expenses) => {
  if (selection.mode === 'month' && selection.month) {
    const [year, month] = selection.month.split('-').map(Number);
    return { anchor: new Date(year, month - 1, 1), months: 1 };
  }
  if (selection.mode === 'year' && selection.year) {
    return { anchor: new Date(Number(selection.year), 11, 1), months: 12 };
  }

  const recordDates = [
    ...sales.map((record) => dateValue(record, ['order_date', 'created_date'])),
    ...expenses.map((record) => dateValue(record, ['expense_date', 'created_date'])),
  ].map((value) => new Date(value)).filter((date) => !Number.isNaN(date.getTime()));
  const customStart = selection.mode === 'custom' && selection.start ? new Date(`${selection.start}T00:00:00`) : null;
  const customEnd = selection.mode === 'custom' && selection.end ? new Date(`${selection.end}T23:59:59`) : null;
  const start = customStart || (recordDates.length ? new Date(Math.min(...recordDates)) : today);
  const end = customEnd || (recordDates.length ? new Date(Math.max(...recordDates)) : today);
  const span = ((end.getFullYear() - start.getFullYear()) * 12) + end.getMonth() - start.getMonth() + 1;
  return { anchor: end, months: Math.min(24, Math.max(1, span)) };
};

export default function Finance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [farmFilter, setFarmFilter] = useState('all');
  const [dateMode, setDateMode] = useState('all');
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const load = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return Promise.all([
      base44.entities.DailyActivity.listAll('-activity_date'),
      base44.entities.Order.listAll('-order_date'),
      base44.entities.Invoice.listAll('-invoice_date'),
    ]).then(([activityRecords, orderRecords, invoiceRecords]) => {
      setActivities(activityRecords || []);
      setOrders(orderRecords || []);
      setInvoices(invoiceRecords || []);
    }).catch((error) => {
      toast({ title: 'Finance data could not be loaded', description: error.message, variant: 'destructive' });
    }).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(() => load(false), 120);
    }, ['DailyActivity', 'FarmExpense', 'Order', 'Invoice']);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [load]);

  const dateSelection = useMemo(() => ({
    mode: dateMode,
    month: monthFilter,
    year: yearFilter,
    start: customStart,
    end: customEnd,
  }), [dateMode, monthFilter, yearFilter, customStart, customEnd]);
  const allExpenses = useMemo(() => activityExpenseRows(activities), [activities]);
  const allSales = useMemo(() => websiteSales(orders), [orders]);
  const allOutstandingInvoices = useMemo(() => {
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const orderByNumber = new Map(orders.map((order) => [order.order_number, order]));
    return outstandingWebsiteInvoices(invoices).map((invoice) => {
      const order = orderById.get(invoice.order_id) || orderByNumber.get(invoice.order_number) || {};
      return {
        ...order,
        ...invoice,
        farm_name: invoice.farm_name || order.farm_name,
        farm_code: invoice.farm_code || order.farm_code,
        block_name: invoice.block_name || order.block_name,
        block_code: invoice.block_code || order.block_code,
        items: invoice.items || order.items,
      };
    });
  }, [invoices, orders]);
  const expenses = useMemo(() => allExpenses.filter((expense) => (
    matchesFarmSelection(expense, farmFilter)
    && matchesDateSelection(dateValue(expense, ['expense_date', 'created_date']), dateSelection)
  )), [allExpenses, farmFilter, dateSelection]);
  const sales = useMemo(() => allSales.filter((sale) => (
    matchesFarmSelection(sale, farmFilter)
    && matchesDateSelection(dateValue(sale, ['order_date', 'created_date']), dateSelection)
  )), [allSales, farmFilter, dateSelection]);
  const outstandingInvoices = useMemo(() => allOutstandingInvoices.filter((invoice) => (
    matchesFarmSelection(invoice, farmFilter)
    && matchesDateSelection(dateValue(invoice, ['invoice_date', 'created_date']), dateSelection)
  )), [allOutstandingInvoices, farmFilter, dateSelection]);
  const totalSales = sumAmounts(sales, 'total_amount');
  const totalExpenses = sumAmounts(expenses, 'amount');
  const outstanding = outstandingInvoices.reduce((sum, invoice) => (
    sum + Number(invoice.balance_due ?? invoice.total_amount ?? 0)
  ), 0);
  const netProfit = totalSales - totalExpenses;
  const monthlyData = useMemo(() => {
    const window = chartWindow(dateSelection, sales, expenses);
    return buildMonthlyFinanceData(sales, expenses, window.anchor, window.months);
  }, [dateSelection, sales, expenses]);

  const resetFilters = () => {
    setFarmFilter('all');
    setDateMode('all');
    setMonthFilter(initialMonth);
    setYearFilter(initialYear);
    setCustomStart('');
    setCustomEnd('');
  };

  const deleteActivityCost = async (activity) => {
    if (!activity?.id || !canClearActivityCosts(user)) return;
    const label = activity.description || activity.title || activity.activity_code || 'this activity';
    const confirmed = window.confirm(
      `Delete the financial cost for ${label}? The Daily Activity record will remain, but its actual and itemized costs will be cleared from Finance.`,
    );
    if (!confirmed) return;

    setDeletingId(activity.id);
    try {
      await base44.entities.DailyActivity.update(activity.id, {
        actual_cost: 0,
        cost: 0,
        labour_cost: 0,
        equipment_cost: 0,
        fuel_cost: 0,
        input_cost: 0,
        transport_cost: 0,
        expense_id: null,
        expense_code: null,
        expense_recorded_at: null,
      });

      if (activity.expense_id) {
        await base44.entities.FarmExpense.delete(activity.expense_id).catch((error) => {
          if (error.status !== 404) throw error;
        });
      }

      setActivities((current) => current.map((item) => (
        item.id === activity.id
          ? { ...item, actual_cost: 0, cost: 0 }
          : item
      )));
      toast({ title: 'Financial cost deleted', description: 'The Daily Activity itself was preserved.' });
    } catch (error) {
      toast({ title: 'Financial cost could not be deleted', description: error.message, variant: 'destructive' });
      await load(false);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" />Filters</div>
          {(farmFilter !== 'all' || dateMode !== 'all') && (
            <Button type="button" size="sm" variant="ghost" onClick={resetFilters}><RotateCcw />Reset</Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Farm / Block</span>
            <select value={farmFilter} onChange={(event) => setFarmFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Farms</option>
              <optgroup label="Farm A">
                <option value="A">Farm A (all blocks)</option>
                {Array.from({ length: 5 }, (_, index) => <option key={`A${index + 1}`} value={`A${index + 1}`}>Farm A{index + 1}</option>)}
              </optgroup>
              <optgroup label="Farm B">
                <option value="B">Farm B (all blocks)</option>
                {Array.from({ length: 5 }, (_, index) => <option key={`B${index + 1}`} value={`B${index + 1}`}>Farm B{index + 1}</option>)}
              </optgroup>
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Date Filter</span>
            <select value={dateMode} onChange={(event) => setDateMode(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Dates</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="custom">Custom Date</option>
            </select>
          </label>

          {dateMode === 'month' && (
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Month</span>
              <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
          )}

          {dateMode === 'year' && (
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Year</span>
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          )}

          {dateMode === 'custom' && (
            <>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>Start Date</span>
                <input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>End Date</span>
                <input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Revenue" value={formatCurrency(totalSales)} icon={TrendingUp} color="blue" subtitle="From website sales" />
        <MetricCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" subtitle="From Daily Activity costs" />
        <MetricCard title="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} color="amber" subtitle="Unpaid website invoices" />
        <MetricCard title="Net Profit" value={formatCurrency(netProfit)} icon={Banknote} color={netProfit >= 0 ? 'green' : 'red'} subtitle="Revenue − Expenses" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-heading font-semibold">Website Sales vs Daily Activity Expenses (₵)</h3>
        <ResponsiveContainer width="100%" height={280} className="mt-4">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={compactCedis} />
            <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="expenses" name="Activity expenses" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sales" name="Website revenue" fill="#2E7D32" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <section className="mt-6">
        <div className="mb-3">
          <h3 className="font-heading font-semibold">Daily Activity Expenses</h3>
          <p className="mt-1 text-xs text-muted-foreground">Deleting a financial cost preserves the operational Daily Activity record.</p>
        </div>
        {loading ? <PageSkeleton contentOnly /> : (
          <DataTable
            items={expenses}
            emptyMessage="No Daily Activity costs match the selected filters."
            columns={[
              { key: 'expense_number', label: 'Activity #' },
              { key: 'description', label: 'Activity' },
              { key: 'expense_date', label: 'Date', format: formatDate },
              { key: 'category', label: 'Cost Type' },
              { key: 'vendor_name', label: 'Responsible' },
              { key: 'amount', label: 'Actual Cost', align: 'right', format: formatCurrency },
              { key: 'status', label: 'Status', render: (value) => <StatusBadge status={String(value || '').toLowerCase()} label={value} /> },
            ]}
            rowActions={canClearActivityCosts(user) ? (activity) => (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deletingId === activity.id}
                onClick={() => deleteActivityCost(activity)}
              >
                <Trash2 />{deletingId === activity.id ? 'Deleting…' : 'Delete'}
              </Button>
            ) : undefined}
          />
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <h3 className="font-heading font-semibold">Recent Website Sales</h3>
          <p className="mt-1 text-xs text-muted-foreground">Orders placed by customers through the public website.</p>
        </div>
        {loading ? <PageSkeleton contentOnly /> : (
          <DataTable items={sales} emptyMessage="No website sales match the selected filters." columns={[
            { key: 'order_number', label: 'Order #' },
            { key: 'order_date', label: 'Date', format: formatDate },
            { key: 'customer_name', label: 'Customer' },
            { key: 'payment_status', label: 'Payment', render: (value) => <StatusBadge status={value || 'pending'} /> },
            { key: 'total_amount', label: 'Total', semantic: 'revenue', align: 'right', format: formatCurrency },
            { key: 'status', label: 'Order Status', render: (value) => <StatusBadge status={value} /> },
          ]} />
        )}
      </section>
    </div>
  );
}
