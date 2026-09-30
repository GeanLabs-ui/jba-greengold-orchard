import { amount, invoiceBalance, outstandingInvoice } from './admin-dashboard';
import { activityCost, activityRevenue, activityYieldKg, activityMatchesBlock, buildFarmOperationsAnalytics, normalizeStatus } from './farm-operations-analytics';
import { matchesFarmScope } from './farm-scope';
import { PROGRAMME_CODE } from '../data/dailyRoutineProgramme';
import { buildCostTypeBreakdown } from './activity-cost-types';

const active = (row) => !row.archived_at && !['inactive', 'archived', 'merged', 'cancelled'].includes(normalizeStatus(row.status));
const sum = (rows, value) => rows.reduce((total, row) => total + value(row), 0);
const closed = (row) => ['completed', 'approved', 'delivered', 'received', 'accepted', 'refunded', 'cancelled', 'closed', 'resolved', 'rejected', 'archived'].includes(normalizeStatus(row.status));
const varietiesOf = (row) => [...(Array.isArray(row.varieties) ? row.varieties : []), ...(Array.isArray(row.mango_varieties) ? row.mango_varieties : []), row.mango_variety || row.variety]
  .filter(Boolean).flatMap((value) => String(value).split(',')).map((value) => readable(value.trim())).filter(Boolean);
export const percentage = (value, total) => total > 0 ? Math.round(value / total * 100) : null;
export const readable = (value) => String(value || 'Not recorded').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

// All financial and output summaries cover the selected calendar year. Physical
// farm/block properties are the current records, not historical snapshots.
export function buildOrchardDashboard(data, year = new Date().getFullYear(), now = new Date()) {
  const inYear = (value) => new Date(value).getFullYear() === year;
  const farms = (data.farms || []).filter(active).sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  const blocks = (data.blocks || []).filter(active).map((row) => ({ ...row, area_acres: row.size_acres ?? row.area_acres ?? row.acres, mango_variety: varietiesOf(row).join(', ') }))
    .sort((a, b) => String(a.block_code || a.name).localeCompare(String(b.block_code || b.name), undefined, { numeric: true }));
  const activities = (data.dailyActivities || []).filter((row) => active(row) && inYear(row.activity_date || row.created_date));
  const orders = (data.orders || []).filter((row) => active(row) && normalizeStatus(row.status) !== 'draft' && inYear(row.order_date || row.created_date));
  const revenue = sum(orders, (row) => amount(row.total_amount));
  const cost = sum(activities, activityCost);
  const harvested = sum(activities, activityYieldKg) / 1000;
  const forecast = sum(blocks, (row) => Math.max(0, amount(row.forecast_yield_kg))) / 1000;
  // The expense card mirrors the overview's default All dates breakdown,
  // including its positive-cost rows and canonical category normalization.
  const expenseAnalytics = buildFarmOperationsAnalytics(data);
  const expenses = buildCostTypeBreakdown(expenseAnalytics.costRows);
  const expenseTotal = expenseAnalytics.totalCost;
  const expenseFarmMap = new Map();
  expenseAnalytics.costRows.forEach((row) => {
    const name = expenseAnalytics.farmFor(row);
    expenseFarmMap.set(name, (expenseFarmMap.get(name) || 0) + row.value);
  });
  const expenseFarms = [...expenseFarmMap].map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  // Classify only explicit market information. Unclassified sales stay visible.
  const sales = ['Export Sales', 'Local Sales', 'Unclassified'].map((name) => ({ name, value: 0 }));
  orders.forEach((row) => {
    const market = normalizeStatus(row.market_type || row.sales_channel || row.market);
    const index = ['export', 'international'].includes(market) ? 0 : ['local', 'domestic'].includes(market) ? 1 : 2;
    sales[index].value += amount(row.total_amount);
  });
  const months = Array.from({ length: 12 }, (_, month) => {
    const monthRevenue = sum(orders.filter((row) => new Date(row.order_date || row.created_date).getMonth() === month), (row) => amount(row.total_amount));
    const monthCost = sum(activities.filter((row) => new Date(row.activity_date || row.created_date).getMonth() === month), activityCost);
    return { name: new Date(year, month, 1).toLocaleDateString('en', { month: 'short' }), revenue: monthRevenue, cost: monthCost, profit: monthRevenue - monthCost };
  });
  // Allocate a record only once: multi-block and unassigned output remains in
  // an explicit unallocated row, rather than being counted against each farm.
  const recordBlock = (row) => {
    const matches = blocks.filter((block) => activityMatchesBlock(row, block));
    return matches.length === 1 ? matches[0] : null;
  };
  const recordFarm = (row) => {
    const block = recordBlock(row);
    if (block) return block.farm_id;
    if (row.farm_id && !row.shared_scope) return row.farm_id;
    const matches = farms.filter((farm) => matchesFarmScope(row, `farm:${farm.id}`, { farms, blocks }));
    return matches.length === 1 ? matches[0].id : null;
  };
  const production = farms.map((farm) => {
    const farmBlocks = blocks.filter((block) => String(block.farm_id) === String(farm.id));
    const rows = activities.filter((row) => String(recordFarm(row) || '') === String(farm.id));
    return { ...farm, blocks: farmBlocks, tonnes: sum(rows, activityYieldKg) / 1000 };
  });
  const unallocated = Math.max(0, Math.round((harvested - sum(production, (row) => row.tonnes)) * 1000) / 1000);
  const varietyMap = new Map();
  activities.forEach((row) => {
    const block = recordBlock(row);
    const names = varietiesOf(row).length ? varietiesOf(row) : varietiesOf(block || {});
    // A mixed-variety block has no recorded per-variety output split.
    const variety = names.length === 1 ? names[0] : 'Unclassified';
    varietyMap.set(variety, (varietyMap.get(variety) || 0) + activityYieldKg(row) / 1000);
  });
  const varieties = [...varietyMap].map(([name, value]) => ({ name, value })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  const varietyNames = [...new Set([...blocks, ...farms].flatMap(varietiesOf))].sort();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events = data.calendarEvents || [];
  const scheduled = [
    ...(data.farmProjects || []).filter((row) => row.programme_code === PROGRAMME_CODE).map((row) => ({ ...row, id: `project-${row.id}`, date: row.due_date || row.start_date })),
    ...(data.farmTasks || []).filter((row) => !row.calendar_event_id || !events.some((event) => event.id === row.calendar_event_id)).map((row) => ({ ...row, id: `task-${row.id}`, date: row.completion_due_at || row.due_date || row.planned_start_at || row.planned_start })),
    ...(data.dailyActivities || []).filter((row) => (!row.calendar_event_id || !events.some((event) => event.id === row.calendar_event_id)) && (!row.farm_task_id || !(data.farmTasks || []).some((task) => task.id === row.farm_task_id))).map((row) => ({ ...row, id: `activity-${row.id}`, date: row.activity_date })),
    ...events.map((row) => ({ ...row, id: `calendar-${row.id}`, date: row.start_at })),
  ];
  const tasks = scheduled.filter((row) => active(row) && !closed(row) && row.date && new Date(row.date) >= today)
    .map((row) => ({ ...row, title: row.title || row.activity_title || row.description || readable(row.category), scope: row.block_name || row.field_area || row.farm_name || blocks.find((block) => block.id === row.block_id)?.block_code || farms.find((farm) => farm.id === row.farm_id)?.name || 'Unassigned' }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const markets = [...new Set((data.exports || []).filter(active).map((row) => row.destination_country || row.destination).filter(Boolean))];
  const productionPath = '/admin/farm-daily-activities';
  const rows = (key) => data[key] || [];
  const mainActivities = rows('farmProjects').filter((row) => row.programme_code === PROGRAMME_CODE && !row.archived_at);
  const openCount = (key) => rows(key).filter((row) => active(row) && !closed(row)).length;
  const item = (label, value, note, path, currency = false) => ({ label, value, note, path, currency });
  const departments = [
    { title: 'Production Summary', items: [
      item('Daily activities', activities.length, `${activities.filter(closed).length} completed · ${year}`, `${productionPath}/activities/records`),
      item('Main activities', mainActivities.length, `${mainActivities.filter((row) => normalizeStatus(row.status) === 'completed').length} completed · ${mainActivities.filter((row) => normalizeStatus(row.status) === 'in_progress').length} in progress`, `${productionPath}/activities/master-schedule`),
      item('Risk register', rows('risks').filter((row) => row.programme_code === PROGRAMME_CODE && active(row) && !closed(row)).length, 'Open programme risks', `${productionPath}/activities/risk-register`),
      item('Equipment', rows('equipment').filter(active).length, `${rows('equipmentUsage').filter((row) => inYear(row.usage_date || row.created_date)).length} usage records · ${year}`, `${productionPath}/equipment/overview`),
      item('Farm reports', rows('reports').filter((row) => inYear(row.report_date || row.created_date)).length, `Daily, weekly and monthly records · ${year}`, `${productionPath}/reports/daily`),
      item('Approvals', openCount('approvals'), 'Awaiting completion · all time', `${productionPath}/activities/approvals`),
      item('Calendar', events.filter((row) => !closed(row) && new Date(row.start_at) >= today).length, 'Upcoming open events', '/admin/calendar'),
      item('Production revenue', sum(activities, activityRevenue), `Logged actual revenue · ${year}`, `${productionPath}/activities/overview`, true),
    ] },
    { title: 'Business Summary', items: [
      item('Clients', rows('customers').filter(active).length, `${openCount('inquiries')} open inquiries`, '/admin/client-management/crm'),
      item('Sales orders', orders.length, `${year} · excludes drafts and cancellations`, '/admin/marketing/orders'),
      item('Website sales', sum(orders.filter((row) => normalizeStatus(row.source) === 'website'), (row) => amount(row.total_amount)), `${year} · included in total revenue`, '/admin/finance', true),
      item('Outstanding invoices', sum(rows('invoices').filter(outstandingInvoice), invoiceBalance), 'Current unpaid balance · all time', '/admin/marketing/sales?invoice=1', true),
      item('Payments received', sum(rows('payments').filter((row) => normalizeStatus(row.status) === 'completed' && inYear(row.payment_date || row.created_date)), (row) => amount(row.amount)), `Completed payments · ${year}`, '/admin/marketing/sales', true),
      item('Products', rows('products').filter(active).length, `${rows('newsPosts').length} news posts`, '/admin/marketing/products'),
      item('Inventory', rows('stock').filter(active).length, `${rows('stock').filter((row) => amount(row.quantity_on_hand) - amount(row.quantity_reserved) <= amount(row.reorder_level)).length} items at reorder level`, '/admin/inventory'),
      item('Deliveries', openCount('deliveries'), 'Open deliveries · all time', '/admin/logistics'),
      item('Procurement', openCount('purchaseOrders'), `${rows('suppliers').filter(active).length} suppliers · open purchase orders`, '/admin/procurement'),
      item('Export shipments', openCount('exports'), `${rows('exports').filter((row) => normalizeStatus(row.status) === 'delayed').length} delayed`, '/admin/export-ops'),
      item('Quotations', openCount('quotations'), 'Open quotations · all time', '/admin/marketing/sales'),
      item('Returns', openCount('returns'), 'Open returns · all time', '/admin/marketing/sales'),
    ] },
  ];
  return { farms, blocks, revenue, cost, profit: revenue - cost, harvested, forecast, remaining: Math.max(0, forecast - harvested), production, unallocated, varieties, varietyNames, expenses, expenseTotal, expenseFarms, sales, months, tasks, markets, departments };
}

export function groupPerformance(months, period, year) {
  const size = period === 'Quarterly' ? 3 : period === 'Yearly' ? 12 : 1;
  return Array.from({ length: 12 / size }, (_, index) => {
    const rows = months.slice(index * size, (index + 1) * size);
    return { name: size === 1 ? rows[0].name : size === 3 ? `Q${index + 1}` : String(year), revenue: sum(rows, (row) => row.revenue), cost: sum(rows, (row) => row.cost), profit: sum(rows, (row) => row.profit) };
  });
}
