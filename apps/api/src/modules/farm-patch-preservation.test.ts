import { describe, expect, it } from 'vitest';
import { activityPeriodUpdateSchema, blockUpdateSchema, harvestPeriodUpdateSchema, inventoryUpdateSchema } from './farms.js';

describe('partial farm updates preserve omitted persisted fields', () => {
  it('does not reactivate an inactive block when only its name changes', () => {
    expect(blockUpdateSchema.parse({ name: 'Updated block' })).not.toHaveProperty('status');
    expect(blockUpdateSchema.parse({ status: 'inactive' }).status).toBe('inactive');
  });
  it('does not reset activity progress or status when only notes change', () => {
    expect(activityPeriodUpdateSchema.parse({ notes: 'Updated notes' })).toEqual({ notes: 'Updated notes' });
    expect(activityPeriodUpdateSchema.parse({ status: 'completed', completion_percent: 100 })).toEqual({ status: 'completed', completion_percent: 100 });
  });
  it('does not reset recorded harvest yields or status', () => {
    expect(harvestPeriodUpdateSchema.parse({ notes: 'Updated notes' })).toEqual({ notes: 'Updated notes' });
    expect(harvestPeriodUpdateSchema.parse({ actual_yield_kg: 25 })).toEqual({ actual_yield_kg: 25 });
  });
  it('does not zero tree counts when only inventory notes change', () => {
    expect(inventoryUpdateSchema.parse({ notes: 'Updated notes' })).toEqual({ notes: 'Updated notes' });
    expect(inventoryUpdateSchema.parse({ dead_trees: 2 })).toEqual({ dead_trees: 2 });
  });
  it('continues to reject invalid status and negative counts', () => {
    expect(activityPeriodUpdateSchema.safeParse({ completion_percent: 101 }).success).toBe(false);
    expect(harvestPeriodUpdateSchema.safeParse({ actual_yield_kg: -1 }).success).toBe(false);
    expect(inventoryUpdateSchema.safeParse({ dead_trees: -1 }).success).toBe(false);
    expect(blockUpdateSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  });
});
