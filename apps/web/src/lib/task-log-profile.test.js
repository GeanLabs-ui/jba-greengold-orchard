import { describe, expect, it } from 'vitest';
import { farmWithTaskLog, taskLogProfile } from './task-log-profile';

const farm = { id: 'a', name: 'Farm A', size_acres: 10, blocks: [{ id: 'a1', farm_id: 'a', block_code: 'A1' }, { id: 'a2', farm_id: 'a', block_code: 'A2' }], analytics: { totalYieldKg: 999999 }, yield_records: [{ actual_yield_kg: 999999 }] };
const period = { start: '2026-01-01', end: '2026-12-31' };
const record = { id: 'log', activity_date: '2026-10-01', farm_id: 'a', block_id: 'a1', actual_cost: 600, actual_revenue: 1000, log_entry: true, output_quantity_kg: 3000, harvest_quantity: 9000, cost: 900 };

describe('task log as profile source', () => {
  it('replaces separate yield records and uses actual fields without double counting', () => {
    const result = farmWithTaskLog(farm, [record], period);
    expect(result.analytics.totalYieldKg).toBe(3000);
    expect(result.task_log).toMatchObject({ totalCost: 600, totalRevenue: 1000 });
    expect(result.blocks.map((block) => block.total_yield_kg)).toEqual([3000, 0]);
    expect(result.yield_records).toHaveLength(1);
  });
  it('reflects edits, explicit zeros, and deletions', () => {
    const edited = taskLogProfile(farm, [{ ...record, actual_cost: 0, actual_revenue: 0, output_quantity_kg: 0 }], period);
    expect(edited).toMatchObject({ totalCost: 0, totalRevenue: 0, totalYieldKg: 0 });
    expect(taskLogProfile(farm, [], period).yieldRecords).toEqual([]);
  });
  it('filters the period and block while keeping the statuses shown in the log', () => {
    const records = [record, { ...record, id: 'old', activity_date: '2025-01-01' }, { ...record, id: 'cancelled', status: 'Cancelled' }, { ...record, id: 'archived', archived_at: '2026-10-01' }, { ...record, id: 'other', block_id: 'a2' }];
    expect(taskLogProfile(farm, records, { ...period, blockId: 'a1' }).activities.map((row) => row.id)).toEqual(['log', 'cancelled', 'archived']);
  });
  it('honors the linked block when the stored farm name is stale', () => {
    const result = taskLogProfile(farm, [{ ...record, farm_id: 'b', farm_name: 'Farm B' }], period);
    expect(result.totalCost).toBe(600);
  });
  it('includes shared entries once per matching scope and rejects stale labels on a linked block', () => {
    const otherBlock = { id: 'b3', farm_id: 'b', block_code: 'B3' };
    const blocks = [...farm.blocks, otherBlock];
    const records = [
      { ...record, id: 'shared', farm_id: '', block_id: '', block_name: 'A1, A2, B3', actual_cost: -50 },
      { ...record, id: 'other', block_id: 'b3', block_name: 'A1' },
    ];
    const result = farmWithTaskLog(farm, records, { ...period, blocks });
    expect(result.task_log.totalCost).toBe(-50);
    expect(result.task_log.activities.map((row) => row.id)).toEqual(['shared']);
    expect(result.blocks.map((block) => block.activity_periods.map((row) => row.id))).toEqual([['shared'], ['shared']]);
  });
});
