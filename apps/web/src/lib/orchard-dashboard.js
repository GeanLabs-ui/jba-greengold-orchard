import { aggregateChartPeriods } from './analytics-periods';
import { buildFarmCalendarEvents } from './production-calendar';
import { amount, invoiceBalance, outstandingInvoice } from './admin-dashboard';
import { activityCost, activityRevenue, activityYieldKg, activityMatchesBlock, buildFarmOperationsAnalytics, normalizeStatus } from './farm-operations-analytics';
import { activityScopeValue, farmCode, matchesFarmScope } from './farm-scope';
import { PROGRAMME_CODE } from '../data/dailyRoutineProgramme';
import { buildCostTypeBreakdown } from './activity-cost-types';
import { MANGO_VARIETIES, mangoVarietyBucket } from './mango-varieties';

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
  const seenActivities = new Set();
  const loggedActivities = (data.dailyActivities || []).filter((row) => {
    if (!active(row)) return false;
    const key = row.id ? `id:${row.id}` : row.activity_code ? `code:${row.activity_code}` : null;
    if (key && seenActivities.has(key)) return false;
    if (key) seenActivities.add(key);
    return true;
  });
  const activities = loggedActivities.filter(row => inYear(row.activity_date || row.created_date));
  const loggedOrders = (data.orders || []).filter(row => active(row) && normalizeStatus(row.status) !== 'draft');
  const orders = loggedOrders.filter(row => inYear(row.order_date || row.created_date));
  const revenue = sum(orders, (row) => amount(row.total_amount));
  const cost = sum(activities, activityCost);
  const harvested = sum(activities, activityYieldKg);
  const forecast = sum(blocks, (row) => Math.max(0, amount(row.forecast_yield_kg)));
  // The expense card mirrors the overview's default All dates breakdown,
  // including its signed cost adjustments and canonical category normalization.
  const expenseAnalytics = buildFarmOperationsAnalytics({ ...data, dailyActivities: (data.dailyActivities || []).filter(active) });
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
  const monthlyHistory = aggregateChartPeriods([
    ...loggedOrders.map(row => ({ date: row.order_date || row.created_date, revenue: row.total_amount })),
    ...loggedActivities.map(row => ({ date: row.activity_date || row.created_date, cost: activityCost(row) })),
  ], 'monthly', ['revenue', 'cost']);
  const monthlyTotals = new Map(monthlyHistory.map(row => [row.key, row]));
  const yearlyPerformance = aggregateChartPeriods(
    monthlyHistory.map(row => ({ ...row, date: row.key })), 'yearly', ['revenue', 'cost'],
  ).map(({ label: name, revenue, cost }) => ({
    name, revenue, cost,
    profit: revenue == null && cost == null ? null : (revenue ?? 0) - (cost ?? 0),
  }));
  const months = Array.from({ length: 12 }, (_, month) => {
    const date = new Date(Date.UTC(year, month, 1));
    const values = monthlyTotals.get(date.toISOString().slice(0, 10));
    return {
      name: date.toLocaleDateString('en-GH', { month: 'short', timeZone: 'UTC' }),
      revenue: values?.revenue ?? null,
      cost: values?.cost ?? null,
      profit: values?.revenue != null || values?.cost != null ? (values.revenue ?? 0) - (values.cost ?? 0) : null,
    };
  });
  // Allocate a record only once: multi-block and unassigned output remains in
  // an explicit unallocated row, rather than being counted against each farm.
  const blocksById = new Map(blocks.map(block => [String(block.id), block]));
  const resolvedBlocks = new Map(activities.map((row) => {
    if (row.block_id) return [row, blocksById.get(String(row.block_id)) ?? null];
    const matches = blocks.filter((block) => activityMatchesBlock(row, block));
    return [row, matches.length === 1 ? matches[0] : null];
  }));
  const recordBlock = (row) => resolvedBlocks.get(row);
  const recordFarm = (row) => {
    const block = recordBlock(row);
    if (block) return block.farm_id;
    if (row.farm_id && !row.shared_scope) return row.farm_id;
    const matches = farms.filter((farm) => matchesFarmScope(row, `farm:${farm.id}`, { farms, blocks }));
    return matches.length === 1 ? matches[0].id : null;
  };
  blocks.forEach((block) => {
    const rows = activities.filter((row) => String(recordBlock(row)?.id || '') === String(block.id));
    block.actual_yield_kg = sum(rows, activityYieldKg);
    block.actual_cost = sum(rows, activityCost);
    block.actual_revenue = sum(rows, activityRevenue);
    block.total_trees = block.tree_count ?? block.total_trees ?? null;
  });
  const sharedActivities = activities.filter((row) => !recordBlock(row) && activityScopeValue(row) === '__all__');
  const sharedBlock = {
    actual_yield_kg: sum(sharedActivities, activityYieldKg),
    activity_count: sharedActivities.length,
    total_trees: blocks.length && blocks.every((block) => block.total_trees != null)
      ? sum(blocks, (block) => amount(block.total_trees)) : null,
    area_acres: blocks.length && blocks.every((block) => block.area_acres != null)
      ? sum(blocks, (block) => amount(block.area_acres)) : null,
    mango_variety: [...new Set(blocks.flatMap(varietiesOf))].sort().join(', '),
  };
  const production = farms.map((farm) => {
    const farmBlocks = blocks.filter((block) => String(block.farm_id) === String(farm.id));
    const rows = activities.filter((row) => String(recordFarm(row) || '') === String(farm.id));
    return { ...farm, blocks: farmBlocks, yieldKg: sum(rows, activityYieldKg) };
  });
  // Scope rows show only output logged at that scope. Block output stays on
  // its own row so farm-wide and combined logs are never counted twice here.
  const summarizeStructure = (rows) => ({
    total_trees: rows.length && rows.every((row) => row.total_trees != null) ? sum(rows, (row) => amount(row.total_trees)) : null,
    area_acres: rows.length && rows.every((row) => row.area_acres != null) ? sum(rows, (row) => amount(row.area_acres)) : null,
    mango_variety: [...new Set(rows.flatMap(varietiesOf))].sort().join(', '),
  });
  const blockManagement = [
    { ...sharedBlock, id: 'shared', label: 'A&B', kind: 'shared', status: sharedBlock.activity_count ? 'active' : 'not_recorded' },
    ...production.map((farm) => {
      const rows = activities.filter((row) => !recordBlock(row) && !['__all__', '__shared__'].includes(activityScopeValue(row)) && String(recordFarm(row) || '') === String(farm.id));
      return { ...summarizeStructure(farm.blocks), id: `farm:${farm.id}`, farm_id: farm.id, label: farmCode(farm) || farm.name, kind: 'farm', actual_yield_kg: sum(rows, activityYieldKg), status: farm.status || 'active' };
    }),
    ...production.flatMap((farm) => farm.blocks.map((block) => ({ ...block, id: `block:${block.id}`, block_id: block.id, label: block.block_code || block.name, kind: 'block', status: block.farming_stage || block.status }))),
  ];
  const unallocated = Math.max(0, Math.round((harvested - sum(production, (row) => row.yieldKg)) * 1000) / 1000);
  const emptyVarieties = () => Object.fromEntries(MANGO_VARIETIES.map(name => [name, 0]));
  const varietyTotals = emptyVarieties();
  const byScope = new Map();
  const knownFarmIds = new Set(production.map(farm => String(farm.id)));
  activities.forEach((row) => {
    const yieldKg = activityYieldKg(row);
    if (!yieldKg) return;
    const block = recordBlock(row);
    const recordedNames = row.mango_variety ? varietiesOf({ mango_variety: row.mango_variety }) : varietiesOf(row);
    const names = new Set((recordedNames.length ? recordedNames : varietiesOf(block || {})).map(mangoVarietyBucket));
    const variety = names.size === 1 ? [...names][0] : 'Others';
    const farmId = block?.farm_id ?? recordFarm(row);
    const scope = !knownFarmIds.has(String(farmId)) ? 'shared' : block ? `block:${block.id}`
      : ['__all__', '__shared__'].includes(activityScopeValue(row)) ? `shared:${farmId}` : `farm:${farmId}`;
    if (!byScope.has(scope)) byScope.set(scope, emptyVarieties());
    byScope.get(scope)[variety] += yieldKg;
    varietyTotals[variety] += yieldKg;
  });
  const varieties = MANGO_VARIETIES.map(name => ({ name, value: varietyTotals[name] }));
  const varietyBreakdown = production.map(farm => ({
    id: farm.id,
    name: farm.name,
    scopes: [
      ...farm.blocks.map(block => ({ id: block.id, name: block.block_code || block.name, values: byScope.get(`block:${block.id}`) })),
      ...(byScope.has(`farm:${farm.id}`) ? [{ id: `farm:${farm.id}`, name: 'Farm-wide', values: byScope.get(`farm:${farm.id}`) }] : []),
      ...(byScope.has(`shared:${farm.id}`) ? [{ id: `shared:${farm.id}`, name: 'Shared blocks', values: byScope.get(`shared:${farm.id}`) }] : []),
    ],
  }));
  if (byScope.has('shared')) varietyBreakdown.push({
    id: 'shared',
    name: 'Shared or unassigned',
    scopes: [{ id: 'shared', name: 'Unallocated to a single farm or block', values: byScope.get('shared') }],
  });
  const varietyNames = varieties.filter(row => row.value !== 0).map(row => row.name);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events = data.calendarEvents || [];
  const scheduled = buildFarmCalendarEvents(data).map((row) => ({ ...row,
    sourceId: row.source_id || row.id,
    id: row.source_entity ? row.id : `calendar-${row.id}`,
    path: `/admin/calendar?event=${encodeURIComponent(row.id)}`,
    date: row.start_at,
  }));
  const tasks = scheduled.filter((row) => row.sourceId && active(row) && !closed(row) && Number(row.progress_percent || 0) < 100 && row.date && new Date(row.date) >= today)
    .map((row) => ({ ...row, title: row.title || row.activity_title || row.description || readable(row.category), scope: row.block_name || row.field_area || row.farm_name || blocks.find((block) => String(block.id) === String(row.block_id))?.block_code || farms.find((farm) => String(farm.id) === String(row.farm_id))?.name || 'Unassigned' }))
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
  return { farms, blocks, sharedBlock, blockManagement, revenue, cost, profit: revenue - cost, harvested, forecast, remaining: Math.max(0, forecast - harvested), production, unallocated, varieties, varietyNames, varietyBreakdown, expenses, expenseTotal, expenseFarms, sales, months, yearlyPerformance, tasks, markets, departments };
}

export function filterBlockManagement(rows, selection = 'all') {
  if (selection === 'all') return rows;
  if (selection.startsWith('farm:')) return rows.filter((row) => row.id === selection || (row.kind === 'block' && String(row.farm_id) === selection.slice(5)));
  return rows.filter((row) => row.id === selection);
}

export function groupPerformance(months, period, year) {
  const size = period === 'Quarterly' ? 3 : period === 'Yearly' ? 12 : 1;
  return Array.from({ length: Math.ceil(months.length / size) }, (_, index) => {
    const rows = months.slice(index * size, (index + 1) * size);
    const totalFor = key => rows.some(row => row[key] != null) ? sum(rows, row => row[key] ?? 0) : null;
    return { name: size === 1 ? rows[0].name : size === 3 ? `Q${index + 1}` : String(year), revenue: totalFor('revenue'), cost: totalFor('cost'), profit: totalFor('profit') };
  });
}
