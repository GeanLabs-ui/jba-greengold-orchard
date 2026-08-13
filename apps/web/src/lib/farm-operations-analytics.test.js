import { describe, expect, it } from 'vitest';
import {
  activityYieldKg,
  buildFarmOperationsAnalytics,
} from './farm-operations-analytics.js';

const farms = [
  { id: 'farm-a', name: 'Farm A', status: 'active' },
  { id: 'farm-b', name: 'Farm B', status: 'active' },
];

const blocks = [
  { id: 'a1', farm_id: 'farm-a', name: 'A1', tree_count: 120, status: 'active' },
  { id: 'a2', farm_id: 'farm-a', name: 'A2', tree_count: 80, status: 'inactive' },
  { id: 'b1', farm_id: 'farm-b', name: 'B1', tree_count: 90, status: 'active' },
];

describe('farm operations analytics', () => {
  it('uses daily activity log records as the single source for operational totals', () => {
    const result = buildFarmOperationsAnalytics({
      farms,
      blocks,
      dailyActivities: [
        {
          id: 'one', farm_id: 'farm-a', block_id: 'a1', activity_date: '2026-08-10',
          category: 'Harvesting', actual_cost: 250, revenue: 900, output_quantity_kg: 300,
          projected_cost: 275,
          status: 'Completed',
        },
        {
          id: 'two', farm_id: 'farm-a', block_id: 'a1', activity_date: '2026-08-11',
          category: 'Pruning', actual_cost: 100, revenue: 0, status: 'In Progress',
          projected_cost: 125,
        },
      ],
      // These are deliberately present to prove they cannot be counted again.
      farmExpenses: [{ amount: 250 }],
      harvestBatches: [{ quantity_harvested_kg: 300 }],
      financeRecords: [{ record_type: 'income', amount: 900 }],
    }, {
      start: new Date('2026-08-01T00:00:00'),
      end: new Date('2026-08-31T23:59:59'),
    });

    expect(result.totalCost).toBe(350);
    expect(result.totalProjectedCost).toBe(400);
    expect(result.totalRevenue).toBe(900);
    expect(result.totalYieldKg).toBe(300);
    expect(result.activeTasks).toBe(1);
  });

  it('filters by farm and date while using current active block inventory for trees', () => {
    const result = buildFarmOperationsAnalytics({
      farms,
      blocks,
      dailyActivities: [
        { farm_id: 'farm-a', activity_date: '2026-08-12', actual_cost: 20, revenue: 40 },
        { farm_id: 'farm-a', activity_date: '2025-08-12', actual_cost: 999, revenue: 999 },
        { farm_id: 'farm-a', actual_cost: 999, revenue: 999 },
        { farm_id: 'farm-b', activity_date: '2026-08-12', actual_cost: 999, revenue: 999 },
      ],
    }, {
      farmId: 'farm-a',
      start: new Date('2026-08-01T00:00:00'),
      end: new Date('2026-08-31T23:59:59'),
    });

    expect(result.visibleFarms).toHaveLength(1);
    expect(result.visibleBlocks.map((block) => block.id)).toEqual(['a1']);
    expect(result.totalTrees).toBe(120);
    expect(result.totalCost).toBe(20);
    expect(result.totalRevenue).toBe(40);
  });

  it('normalizes harvest quantities from full and compact daily log entries', () => {
    expect(activityYieldKg({ harvest_quantity: 50, output_quantity_kg: 100 })).toBe(50);
    expect(activityYieldKg({ grade_a_quantity: 30, grade_b_quantity: 10, rejected_quantity: 5 })).toBe(45);
    expect(activityYieldKg({ category: 'Harvesting', output_quantity_kg: 75 })).toBe(75);
    expect(activityYieldKg({ category: 'Pruning', quantity_used: 75 })).toBe(0);
  });

  it('assigns older activity rows to a farm through their saved block relationship', () => {
    const result = buildFarmOperationsAnalytics({
      farms,
      blocks,
      dailyActivities: [{ block_id: 'a1', activity_date: '2026-08-13', actual_cost: 55 }],
    }, { farmId: 'farm-a' });

    expect(result.activities).toHaveLength(1);
    expect(result.farmFor(result.activities[0])).toBe('Farm A');
    expect(result.farmFor({ farm_name: 'All Farms' })).toBe('Unassigned farm');
    expect(result.totalCost).toBe(55);
  });
});
