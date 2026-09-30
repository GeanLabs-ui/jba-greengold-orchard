import { activityCost, activityRevenue, activityYieldKg, normalizeStatus } from './farm-operations-analytics';

export const amount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const completedPayment = (row) => normalizeStatus(row.status) === 'completed';
export const invoiceBalance = (row) => Math.max(0, amount(row.balance_due ?? row.total_amount));
export const outstandingInvoice = (row) => !['paid', 'cancelled', 'void', 'draft'].includes(normalizeStatus(row.status)) && invoiceBalance(row) > 0;
export function buildDashboardAnalytics(data, now = new Date()) {
  const activities = data.dailyActivities || [];
  const done = (row) => ['completed', 'approved'].includes(normalizeStatus(row.status));
  const active = activities.filter((row) => normalizeStatus(row.status) !== 'cancelled');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdue = active.filter((row) => !done(row) && new Date(row.activity_date || row.created_date) < today);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const inMonth = (value) => { const d = new Date(value); return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth(); };
    const rows = activities.filter((row) => inMonth(row.activity_date || row.created_date));
    return { month: date.toLocaleDateString('en-GH', { month: 'short' }),
      yield: rows.reduce((sum, row) => sum + activityYieldKg(row), 0),
      costs: rows.reduce((sum, row) => sum + activityCost(row), 0),
      revenue: rows.reduce((sum, row) => sum + activityRevenue(row), 0) };
  });
  const costs = new Map();
  activities.filter((row) => { const date = new Date(row.activity_date || row.created_date); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); })
    .forEach((row) => { const label = row.cost_type || row.category || 'Other'; costs.set(label, (costs.get(label) || 0) + activityCost(row)); });
  const orderStages = new Map();
  (data.orders || []).forEach((row) => { const label = normalizeStatus(row.status) || 'unspecified'; orderStages.set(label, (orderStages.get(label) || 0) + 1); });
  return { months, overdue, completed: active.filter(done).length, total: active.length,
    completion: active.length ? Math.round(active.filter(done).length / active.length * 100) : null,
    costs: [...costs].map(([name, value]) => ({ name, value })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value),
    orderStages: [...orderStages].map(([name, value]) => ({ name: name.replaceAll('_', ' '), value })),
  };
}
