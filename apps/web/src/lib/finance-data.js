const asAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalized = (value) => String(value || '').trim().toLowerCase();

export { matchesFarmScope as matchesFarmSelection } from './farm-scope';
import { aggregateChartPeriods } from './analytics-periods';

export function matchesDateSelection(value, selection = {}) {
  const mode = selection.mode || 'all';
  if (mode === 'all') return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (mode === 'month') {
    const [year, month] = String(selection.month || '').split('-').map(Number);
    return Boolean(year && month)
      && date.getFullYear() === year
      && date.getMonth() === month - 1;
  }

  if (mode === 'year') return date.getFullYear() === Number(selection.year);

  if (mode === 'custom') {
    const start = selection.start ? new Date(`${selection.start}T00:00:00`) : null;
    const end = selection.end ? new Date(`${selection.end}T23:59:59.999`) : null;
    return (!start || date >= start) && (!end || date <= end);
  }

  return true;
}

export function dailyActivityCost(activity) {
  const hasActualCost = activity?.actual_cost !== ''
    && activity?.actual_cost !== null
    && activity?.actual_cost !== undefined;
  return asAmount(hasActualCost ? activity.actual_cost : activity?.cost);
}

export function activityExpenseRows(activities = []) {
  return activities
    .filter((activity) => !activity.archived_at
      && !['archived', 'cancelled', 'canceled', 'deleted'].includes(normalized(activity.status)))
    .map((activity) => ({
      ...activity,
      expense_number: activity.activity_code || `ACT-${String(activity.id || '').slice(0, 8)}`,
      expense_date: activity.activity_date || activity.created_date,
      category: activity.cost_type || activity.category || 'Farm Operations',
      description: activity.title || activity.activity_title || activity.description || 'Daily activity',
      vendor_name: activity.responsible || activity.assigned_workers || activity.supervisor_name || 'Farm operations',
      amount: dailyActivityCost(activity),
      source_label: 'Daily Activity',
    }))
    .filter((activity) => activity.amount !== 0);
}

export function websiteSales(orders = []) {
  return orders.filter((order) => (
    normalized(order.source) === 'website'
    && !['cancelled', 'draft'].includes(normalized(order.status))
  ));
}

export function outstandingWebsiteInvoices(invoices = []) {
  return invoices.filter((invoice) => (
    normalized(invoice.source) === 'website'
    && normalized(invoice.status) !== 'paid'
  ));
}

export function buildMonthlyFinanceData(sales = [], expenses = [], now = new Date(), monthCount = 6) {
  const totals = new Map(aggregateChartPeriods([
    ...sales.map(row => ({ date: row.order_date || row.created_date, sales: row.total_amount })),
    ...expenses.map(row => ({ date: row.expense_date || row.created_date, expenses: row.amount })),
  ], 'monthly', ['sales', 'expenses']).map(row => [row.key, row]));
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthCount + 1 + index, 1));
    const total = totals.get(date.toISOString().slice(0, 10));
    return {
      month: date.toLocaleDateString('en-GH', { month: 'short', timeZone: 'UTC' }),
      sales: total?.sales ?? null,
      expenses: total?.expenses ?? null,
    };
  });
}

export function sumAmounts(items = [], field) {
  return items.reduce((sum, item) => sum + asAmount(item?.[field]), 0);
}
