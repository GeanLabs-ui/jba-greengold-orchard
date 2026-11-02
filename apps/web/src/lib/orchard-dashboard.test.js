import { describe, expect, it } from 'vitest';
import { buildOrchardDashboard, filterBlockManagement, groupPerformance } from './orchard-dashboard';
import { PROGRAMME_CODE } from '../data/dailyRoutineProgramme';
import { buildFarmOperationsAnalytics } from './farm-operations-analytics';
import { buildCostTypeBreakdown } from './activity-cost-types';

describe('orchard reference dashboard', () => {
  it('orders A&B, A, B and blocks, with scope-specific kg readings and one complete filter', () => {
    const data = {
      farms: [{ id: 'a', name: 'Farm Land A' }, { id: 'b', name: 'Farm Land B' }],
      blocks: [{ id: 'a1', farm_id: 'a', block_code: 'A1', tree_count: 10, size_acres: 2 }, { id: 'b1', farm_id: 'b', block_code: 'B1', tree_count: 20, size_acres: 3 }],
      dailyActivities: [
        { activity_date: '2026-01-01', shared_scope: 'Farm A&B', output_quantity_kg: 100.5 },
        { activity_date: '2026-01-01', farm_id: 'a', block_name: 'Farm A', output_quantity_kg: 200 },
        { activity_date: '2026-01-01', farm_name: 'Farm Land B', output_quantity_kg: 300 },
        { activity_date: '2026-01-01', farm_id: 'a', block_id: 'a1', output_quantity_kg: 400 },
        { activity_date: '2026-01-01', farm_id: 'b', block_id: 'b1', output_quantity_kg: 500 },
        { activity_date: '2026-01-01', farm_id: 'a', block_name: 'Farm A', status: 'cancelled', output_quantity_kg: 10000 },
      ],
    };
    const result = buildOrchardDashboard(data, 2026);
    expect(result.blockManagement.map((row) => row.label)).toEqual(['A&B', 'A', 'B', 'A1', 'B1']);
    expect(result.blockManagement.map((row) => row.actual_yield_kg)).toEqual([100.5, 200, 300, 400, 500]);
    expect(result.blockManagement.map((row) => row.total_trees)).toEqual([30, 10, 20, 10, 20]);
    expect(result.harvested).toBe(1500.5);
    expect(result.production.map((farm) => farm.yieldKg)).toEqual([600, 800]);
    expect(filterBlockManagement(result.blockManagement)).toHaveLength(5);
    expect(filterBlockManagement(result.blockManagement, 'shared').map((row) => row.label)).toEqual(['A&B']);
    expect(filterBlockManagement(result.blockManagement, 'farm:a').map((row) => row.label)).toEqual(['A', 'A1']);
    expect(filterBlockManagement(result.blockManagement, 'farm:b').map((row) => row.label)).toEqual(['B', 'B1']);
    expect(filterBlockManagement(result.blockManagement, 'block:b1').map((row) => row.label)).toEqual(['B1']);
    expect(filterBlockManagement(result.blockManagement, 'block:missing')).toEqual([]);
    data.dailyActivities[1].output_quantity_kg = 0;
    expect(buildOrchardDashboard(data, 2026).blockManagement[1].actual_yield_kg).toBe(0);
    data.dailyActivities.splice(2, 1);
    expect(buildOrchardDashboard(data, 2026).blockManagement[2].actual_yield_kg).toBe(0);
  });
  it('keeps A&B daily-log output separate from individual blocks and other shared scopes', () => {
    const data = {
      farms: [{ id: 'a', name: 'Farm A' }, { id: 'b', name: 'Farm B' }],
      blocks: [
        { id: 'a1', farm_id: 'a', block_code: 'A1', tree_count: 120, size_acres: 5 },
        { id: 'b1', farm_id: 'b', block_code: 'B1', tree_count: 0, size_acres: 3 },
        { id: 'old', farm_id: 'a', status: 'archived', tree_count: 900 },
      ],
      dailyActivities: [
        { id: 'shared', activity_date: '2026-01-01', shared_scope: 'Farm A&B', output_quantity_kg: 1500 },
        { activity_date: '2026-01-01', block_name: 'A & B', output_quantity_kg: 500 },
        { activity_date: '2026-01-01', farm_name: 'Farm A&B', block_id: 'a1', output_quantity_kg: 2000 },
        { activity_date: '2026-01-01', farm_name: 'Farm A&B', shared_scope: 'A1, B1', output_quantity_kg: 3000 },
        { activity_date: '2026-01-01', output_quantity_kg: 4000 },
        { activity_date: '2025-01-01', shared_scope: 'Farm A&B', output_quantity_kg: 5000 },
        { activity_date: '2026-01-01', shared_scope: 'Farm A&B', status: 'cancelled', output_quantity_kg: 6000 },
        { activity_date: '2026-01-01', shared_scope: 'Farm A&B', archived_at: '2026-01-02', output_quantity_kg: 7000 },
      ],
    };
    const result = buildOrchardDashboard(data, 2026);
    expect(result.sharedBlock).toMatchObject({ actual_yield_kg: 2000, activity_count: 2, total_trees: 120, area_acres: 8 });
    expect(result.blocks.map((block) => block.total_trees)).toEqual([120, 0]);
    expect(result.blocks.map((block) => block.actual_yield_kg)).toEqual([2000, 0]);
    data.dailyActivities[0].output_quantity_kg = 0;
    expect(buildOrchardDashboard(data, 2026).sharedBlock.actual_yield_kg).toBe(500);
    data.dailyActivities = data.dailyActivities.filter((row) => row.id !== 'shared');
    expect(buildOrchardDashboard(data, 2026).sharedBlock.activity_count).toBe(1);
  });
  it('leaves unknown tree inventory empty instead of presenting partial totals as complete', () => {
    const result = buildOrchardDashboard({ blocks: [{ id: 'a1', tree_count: 0 }, { id: 'b1' }] }, 2026);
    expect(result.blocks.map((block) => block.total_trees)).toEqual([0, null]);
    expect(result.sharedBlock.total_trees).toBeNull();
    expect(buildOrchardDashboard({}, 2026).sharedBlock.total_trees).toBeNull();
  });
  it('routes upcoming saved work to its source using the original encoded record IDs', () => {
    const result = buildOrchardDashboard({
      farmProjects: [{ id: 'main/1', programme_code: PROGRAMME_CODE, title: 'Main task', due_date: '2026-10-02' }],
      farmTasks: [
        { id: 'child', parent_project_id: 'main/1', title: 'Subtask', due_date: '2026-10-03' },
        { id: 'standalone', title: 'Standalone', due_date: '2026-10-04' },
        { id: 'linked', calendar_event_id: 'missing/event', title: 'Linked', due_date: '2026-10-05' },
      ],
      dailyActivities: [{ id: 'log/1', activity_date: '2026-10-06', title: 'Daily log' }],
      calendarEvents: [{ id: 'event/1', start_at: '2026-10-07', title: 'Calendar event' }],
    }, 2026, new Date('2026-10-01T12:00:00Z'));
    expect(result.tasks.map(({ path }) => path)).toEqual([
      '/admin/calendar?event=project-main%2F1',
      '/admin/calendar?event=task-child',
      '/admin/calendar?event=task-standalone',
      '/admin/calendar?event=task-linked',
      '/admin/calendar?event=activity-log%2F1',
      '/admin/calendar?event=event%2F1',
    ]);
  });
  it('uses persisted scope and excludes archived, cancelled, completed and invalid upcoming work', () => {
    const result = buildOrchardDashboard({
      farms: [{ id: 'farm', name: 'Live Farm' }], blocks: [{ id: 'block', block_code: 'Live Block' }],
      farmTasks: [
        { id: 'open', farm_id: 'farm', due_date: '2027-01-01', title: 'Next year' },
        { id: 'block-task', block_id: 'block', due_date: '2026-10-01', title: 'Today' },
        { id: 'archived', archived_at: '2026-09-01', due_date: '2026-10-02' },
        { id: 'cancelled', status: 'cancelled', due_date: '2026-10-02' },
        { id: 'done', status: 'completed', due_date: '2026-10-02' },
        { id: 'full', progress_percent: 100, due_date: '2026-10-02' },
        { id: 'invalid', due_date: 'bad date' },
      ],
    }, 2026, new Date('2026-10-01T12:00:00Z'));
    expect(result.tasks.map(({ id, scope }) => ({ id, scope }))).toEqual([
      { id: 'task-block-task', scope: 'Live Block' }, { id: 'task-open', scope: 'Live Farm' },
    ]);
  });
  it('reads the expense card from the same all-date rows and categories as operations analytics', () => {
    const data = { dailyActivities: [
      { activity_date: '2026-01-01', actual_cost: 100, cost_type: 'labour' },
      { activity_date: '2025-01-01', actual_cost: 30, cost_type: 'unknown' },
      { activity_date: '2026-01-01', actual_cost: 0, cost: 500, cost_type: 'Tools' },
      { activity_date: '2026-01-01', actual_cost: -10, cost_type: 'Labor' },
    ] };
    const dashboard = buildOrchardDashboard(data, 2026);
    const analytics = buildFarmOperationsAnalytics(data);
    expect(dashboard.expenseTotal).toBe(130);
    expect(dashboard.expenseTotal).toBe(analytics.totalCost);
    expect(dashboard.expenses).toEqual(buildCostTypeBreakdown(analytics.costRows));
    expect(dashboard.expenses.map(({ name }) => name)).toEqual(['Administration', 'Materials', 'Labor', 'Tools', 'Transportation', 'Food/Ent', 'Others']);
    expect(dashboard.expenses.find((row) => row.name === 'Tools').value).toBe(0);
  });
  it('preserves the analytics farm split including unassigned costs and reconciles both breakdowns', () => {
    const result = buildOrchardDashboard({ farms: [{ id: 'a', name: 'Farm A' }, { id: 'b', name: 'Farm B' }], dailyActivities: [
      { farm_id: 'a', actual_cost: 200, cost_type: 'Labor' },
      { farm_id: 'b', actual_cost: 50, cost_type: 'Tools' },
      { actual_cost: 10, cost_type: 'Others' },
    ] }, 2026);
    expect(result.expenseFarms).toEqual([{ name: 'Farm A', value: 200 }, { name: 'Farm B', value: 50 }, { name: 'Unassigned farm', value: 10 }]);
    expect(result.expenseFarms.reduce((total, row) => total + row.value, 0)).toBe(result.expenseTotal);
    expect(result.expenses.reduce((total, row) => total + row.value, 0)).toBe(result.expenseTotal);
  });
  it('uses annual records, excludes cancelled records, and honors explicit zero output and cost', () => {
    const result = buildOrchardDashboard({
      orders: [{ order_date: '2026-01-03', total_amount: 100, status: 'confirmed' }, { order_date: '2026-01-03', total_amount: 80, status: 'cancelled' }, { order_date: '2025-01-03', total_amount: 50, status: 'confirmed' }],
      dailyActivities: [{ activity_date: '2026-01-03', log_entry: true, output_quantity_kg: 0, harvest_quantity: 1000, actual_cost: 0, cost: 80 }, { activity_date: '2026-02-01', output_quantity_kg: 2000, cost: 20 }, { activity_date: '2026-03-01', status: 'cancelled', output_quantity_kg: 5000, cost: 500 }],
    }, 2026);
    expect(result).toMatchObject({ revenue: 100, cost: 20, profit: 80, harvested: 2000, unallocated: 2000 });
    expect(result.sales[2].value).toBe(100);
    expect(groupPerformance(result.months, 'Quarterly', 2026)[0]).toEqual({ name: 'Q1', revenue: 100, cost: 20, profit: 80 });
    expect(groupPerformance(result.months, 'Yearly', 2026)).toEqual([{ name: '2026', revenue: 100, cost: 20, profit: 80 }]);
  });
  it('keeps shared output unallocated and never counts a block record twice', () => {
    const result = buildOrchardDashboard({ farms: [{ id: 'a', name: 'Farm A' }, { id: 'b', name: 'Farm B' }], blocks: [{ id: 'a1', farm_id: 'a', mango_variety: 'Keitt' }], dailyActivities: [
      { activity_date: '2026-01-01', block_id: 'a1', farm_id: 'b', output_quantity_kg: 1200 },
      { activity_date: '2026-01-01', farm_name: 'Farm A&B', output_quantity_kg: 400 },
    ] }, 2026);
    expect(result.production.map((row) => row.yieldKg)).toEqual([1200, 0]);
    expect(result.blocks[0].actual_yield_kg).toBe(1200);
    expect(result.unallocated).toBe(400);
    expect(result.varieties).toEqual([{ name: 'Keitt', value: 1200 }, { name: 'Unclassified', value: 400 }]);
    expect(result.forecast).toBe(0);
  });
  it('keeps empty workspaces empty and only includes future open tasks', () => {
    expect(buildOrchardDashboard({}, 2026)).toMatchObject({ revenue: 0, harvested: 0, tasks: [], varieties: [], production: [] });
    const result = buildOrchardDashboard({ dailyActivities: [
      { id: 'old', activity_date: '2026-01-01', status: 'pending' },
      { id: 'done', activity_date: '2026-10-01', status: 'completed' },
      { id: 'next', activity_date: '2026-10-01', status: 'pending' },
    ] }, 2026, new Date(2026, 8, 30));
    expect(result.tasks.map((row) => row.id)).toEqual(['activity-next']);
  });
  it('reads canonical block acreage and individual varieties and allocates legacy block labels once', () => {
    const result = buildOrchardDashboard({ farms: [{ id: 'a', name: 'Farm A' }, { id: 'b', name: 'Farm B' }], blocks: [
      { id: 'a1', farm_id: 'a', block_code: 'A1', size_acres: 12, variety: 'Kent, Keitt' },
      { id: 'b1', farm_id: 'b', block_code: 'B1', mango_variety: 'kent' },
    ], dailyActivities: [
      { activity_date: '2026-01-01', block_name: 'A1', output_quantity_kg: 1000 },
      { activity_date: '2026-01-01', block_name: 'A1 & B1', shared_scope: 'A1 & B1', output_quantity_kg: 500 },
      { activity_date: '2026-01-01', block_name: 'B1', output_quantity_kg: 2000 },
    ] }, 2026);
    expect(result.varietyNames).toEqual(['Keitt', 'Kent']);
    expect(result.blocks[0].area_acres).toBe(12);
    expect(result.production.map((row) => row.yieldKg)).toEqual([1000, 2000]);
    expect(result.unallocated).toBe(500);
    expect(result.varieties).toEqual([{ name: 'Kent', value: 2000 }, { name: 'Unclassified', value: 1500 }]);
  });
  it('does not duplicate calendar-linked tasks or invent a farm for unassigned tasks', () => {
    const result = buildOrchardDashboard({
      calendarEvents: [{ id: 'event', start_at: '2026-10-01', title: 'Irrigation', status: 'scheduled' }],
      farmTasks: [{ id: 'task', calendar_event_id: 'event', due_date: '2026-10-01' }, { id: 'standalone', completion_due_at: '2026-10-02', title: 'Inspect' }],
      dailyActivities: [{ id: 'log', calendar_event_id: 'event', activity_date: '2026-10-01' }],
    }, 2026, new Date(2026, 8, 30));
    expect(result.tasks.map((row) => row.id)).toEqual(['calendar-event', 'task-standalone']);
    expect(result.tasks[0].scope).toBe('Unassigned');
  });
  it('summarizes business balances from persisted records without adding payments or invoices to sales', () => {
    const result = buildOrchardDashboard({
      orders: [{ total_amount: 150, source: 'website', order_date: '2026-01-01', status: 'confirmed' }, { total_amount: 500, order_date: '2026-01-01', status: 'draft' }],
      invoices: [{ total_amount: 150, balance_due: 50, status: 'partial' }, { total_amount: 900, status: 'void' }],
      payments: [{ amount: 100, status: 'completed', payment_date: '2026-01-01' }, { amount: 1000, status: 'failed', payment_date: '2026-01-01' }],
      purchaseOrders: [{ status: 'sent' }, { status: 'received' }],
      dailyActivities: [{ activity_date: '2026-01-01', actual_revenue: 150, actual_cost: 20 }],
    }, 2026);
    const business = Object.fromEntries(result.departments[1].items.map((row) => [row.label, row.value]));
    expect(result.revenue).toBe(150);
    expect(result.profit).toBe(130);
    expect(business).toMatchObject({ 'Sales orders': 1, 'Website sales': 150, 'Outstanding invoices': 50, 'Payments received': 100, Procurement: 1 });
    expect(result.departments[0].items.find((row) => row.label === 'Production revenue').value).toBe(150);
  });
  it('matches Main Activities current records even when the legacy enabled flag is false', () => {
    const result = buildOrchardDashboard({ farmProjects: [
      { programme_code: PROGRAMME_CODE, is_enabled: false, status: 'not_started' },
      { programme_code: PROGRAMME_CODE, status: 'completed' },
      { programme_code: PROGRAMME_CODE, archived_at: '2026-01-01' },
      { programme_code: 'different' },
    ] }, 2026);
    expect(result.departments[0].items.find((row) => row.label === 'Main activities')).toMatchObject({ value: 2, note: '1 completed · 0 in progress' });
  });
});
