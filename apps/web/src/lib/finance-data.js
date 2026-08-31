const asAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalized = (value) => String(value || '').trim().toLowerCase();

const locationText = (record = {}) => {
  const records = [record, ...(Array.isArray(record.items) ? record.items : [])];
  return records.flatMap((item) => [
    item?.farm_code,
    item?.farm_name,
    item?.farm,
    item?.block_code,
    item?.block_name,
    item?.block,
  ]).filter(Boolean).join(' ').toUpperCase();
};

export function matchesFarmSelection(record, selection = 'all') {
  const selected = String(selection || 'all').trim().toUpperCase();
  if (selected === 'ALL') return true;

  const text = locationText(record);
  const blockCodes = new Set(text.match(/\b[AB][1-5]\b/g) || []);
  const farmCodes = new Set(
    [...text.matchAll(/\bFARM(?:\s+LAND)?\s+([AB])\b/g)].map((match) => match[1]),
  );

  if (/^[AB][1-5]$/.test(selected)) return blockCodes.has(selected);
  if (/^[AB]$/.test(selected)) {
    return farmCodes.has(selected) || [...blockCodes].some((code) => code.startsWith(selected));
  }
  return false;
}

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
    .filter((activity) => activity.amount > 0);
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
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (monthCount - 1 - index));
    const inMonth = (value) => {
      const current = new Date(value);
      return !Number.isNaN(current.getTime())
        && current.getFullYear() === date.getFullYear()
        && current.getMonth() === date.getMonth();
    };

    return {
      month: date.toLocaleDateString('en-GH', { month: 'short' }),
      sales: sales
        .filter((sale) => inMonth(sale.order_date || sale.created_date))
        .reduce((sum, sale) => sum + asAmount(sale.total_amount), 0),
      expenses: expenses
        .filter((expense) => inMonth(expense.expense_date || expense.created_date))
        .reduce((sum, expense) => sum + asAmount(expense.amount), 0),
    };
  });
}

export function sumAmounts(items = [], field) {
  return items.reduce((sum, item) => sum + asAmount(item?.[field]), 0);
}
