import { describe, expect, it } from 'vitest';
import {
  activityCost,
  activityMatchesBlock,
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

  it('filters by farm and date while retaining inactive block inventory for trees', () => {
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
    expect(result.visibleBlocks.map((block) => block.id)).toEqual(['a1', 'a2']);
    expect(result.totalTrees).toBe(200);
    expect(result.totalCost).toBe(20);
    expect(result.totalRevenue).toBe(40);
  });

  it('retains all ten orchard blocks including inactive B3 and inactive farms in physical totals', () => {
    const orchardBlocks = Array.from({ length: 10 }, (_, index) => ({
      id: `block-${index}`, farm_id: index < 5 ? 'farm-a' : 'farm-b',
      block_code: `${index < 5 ? 'A' : 'B'}${index % 5 + 1}`,
      status: index === 7 ? 'inactive' : 'active', tree_count: 100,
    }));
    const data = {
      farms: [farms[0], { ...farms[1], status: 'inactive' }, { id: 'old', status: 'archived' }],
      blocks: [...orchardBlocks, { id: 'old', farm_id: 'farm-a', status: 'archived', tree_count: 900 },
        { id: 'merged', farm_id: 'farm-a', status: 'merged', tree_count: 900 },
        { id: 'archived-date', farm_id: 'farm-a', archived_at: '2026-01-01', tree_count: 900 }],
      dailyActivities: [{ id: 'b3-log', block_id: 'block-7', actual_cost: 50, output_quantity_kg: 20 }],
    };
    const overview = buildFarmOperationsAnalytics(data);
    expect(overview.visibleFarms.map(row => row.id)).toEqual(['farm-a', 'farm-b']);
    expect(overview.visibleBlocks).toHaveLength(10);
    expect(overview.visibleBlocks.find(row => row.block_code === 'B3').status).toBe('inactive');
    expect(overview.totalTrees).toBe(1000);
    const selectedFarm = buildFarmOperationsAnalytics(data, { farmId: 'farm-b' });
    expect(selectedFarm.visibleFarms[0].status).toBe('inactive');
    expect(selectedFarm.visibleBlocks).toHaveLength(5);
    expect(selectedFarm.totalTrees).toBe(500);
    const selectedBlock = buildFarmOperationsAnalytics(data, { blockId: 'block-7' });
    expect(selectedBlock.visibleBlocks.map(row => row.block_code)).toEqual(['B3']);
    expect(selectedBlock.totalTrees).toBe(100);
    expect(selectedBlock.totalCost).toBe(50);
    expect(selectedBlock.totalYieldKg).toBe(20);
  });

  it('normalizes harvest quantities from full and compact daily log entries', () => {
    expect(activityYieldKg({ harvest_quantity: 50, output_quantity_kg: 100 })).toBe(50);
    expect(activityYieldKg({ grade_a_quantity: 30, grade_b_quantity: 10, rejected_quantity: 5 })).toBe(45);
    expect(activityYieldKg({ category: 'Harvesting', output_quantity_kg: 75 })).toBe(75);
    expect(activityYieldKg({ category: 'Pruning', quantity_used: 75 })).toBe(0);
  });

  it('includes explicitly recorded output for every farm task type without treating material quantity as yield', () => {
    const result = buildFarmOperationsAnalytics({
      dailyActivities: [
        { category: 'Planting', actual_cost: 125, actual_revenue: 350, output_quantity_kg: 80 },
        { category: 'Pruning', actual_cost: 25, actual_revenue: 50, output_quantity_kg: 20 },
        { category: 'Fertilizer Application', quantity_used: 500 },
      ],
    });

    expect(result.totalYieldKg).toBe(100);
    expect(result.totalCost).toBe(150);
    expect(result.totalRevenue).toBe(400);
    expect(result.totalRevenue - result.totalCost).toBe(250);
    expect(activityYieldKg({ category: 'Harvesting', output_quantity_kg: 0, quantity_used: 500 })).toBe(0);
  });

  it('uses the calculated activity cost when the optional actual-cost field is blank', () => {
    expect(activityCost({ actual_cost: '', cost: 125 })).toBe(125);
    expect(activityCost({ actual_cost: 0, cost: 125 })).toBe(0);
  });

  it('uses the edited compact task output even when older harvest fields remain', () => {
    const record = { log_entry: true, category: 'Planting', harvest_quantity: 100, grade_a_quantity: 100 };
    expect(activityYieldKg({ ...record, output_quantity_kg: 20 })).toBe(20);
    expect(activityYieldKg({ ...record, output_quantity_kg: 0 })).toBe(0);
  });

  it('matches block performance rows only to an explicit saved block reference', () => {
    const block = { id: 'a1', name: 'A1', block_code: 'A1' };

    expect(activityMatchesBlock({ block_id: 'a1' }, block)).toBe(true);
    expect(activityMatchesBlock({ block_code: 'a1' }, block)).toBe(true);
    expect(activityMatchesBlock({ block_name: 'A1' }, block)).toBe(true);
    expect(activityMatchesBlock({}, block)).toBe(false);
    expect(activityMatchesBlock({ block_id: 'b1' }, block)).toBe(false);
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

  it('filters an analytics view to a selected farm block', () => {
    const result = buildFarmOperationsAnalytics({
      farms,
      blocks,
      dailyActivities: [
        { id: 'a1-row', block_id: 'a1', activity_date: '2026-08-13', actual_cost: 55 },
        { id: 'b1-row', block_id: 'b1', activity_date: '2026-08-13', actual_cost: 80 },
      ],
    }, { blockId: 'a1' });

    expect(result.visibleFarms.map((farm) => farm.id)).toEqual(['farm-a']);
    expect(result.visibleBlocks.map((block) => block.id)).toEqual(['a1']);
    expect(result.activities.map((activity) => activity.id)).toEqual(['a1-row']);
    expect(result.totalCost).toBe(55);
  });
});
