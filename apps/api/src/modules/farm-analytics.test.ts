import { describe, expect, it } from 'vitest';
import { checkFarmSizeAllocation, computeFarmAnalytics, isMergeEligible } from './farm-analytics.js';

describe('computeFarmAnalytics', () => {
  const baseBlocks = [
    { id: 'b1', status: 'active', size_acres: 5 },
    { id: 'b2', status: 'active', size_acres: 3 },
    { id: 'b3', status: 'inactive', size_acres: 4 },
    { id: 'b4', status: 'merged', size_acres: 2 },
  ];
  const baseInventories = [
    { block_id: 'b1', crop_variety_id: 'kent', variety_name: 'Kent', total_trees: 100, productive_trees: 80, effective_to: null },
    { block_id: 'b2', crop_variety_id: 'keitt', variety_name: 'Keitt', total_trees: 50, productive_trees: 40, effective_to: null },
    // inactive block's inventory must not count toward current totals
    { block_id: 'b3', crop_variety_id: 'kent', variety_name: 'Kent', total_trees: 30, productive_trees: 30, effective_to: null },
    // superseded inventory row (effective_to set) must not count either
    { block_id: 'b1', crop_variety_id: 'kent', variety_name: 'Kent', total_trees: 20, productive_trees: 20, effective_to: '2025-01-01' },
  ];

  it('sums size and tree totals from active blocks only, excluding inactive/merged blocks and superseded inventory', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: 10,
      blocks: baseBlocks,
      inventories: baseInventories,
      yieldRecords: [],
      harvestPeriods: [],
      activityPeriods: [],
    });

    expect(result.totalAllocatedSizeAcres).toBe(8); // b1 (5) + b2 (3), not b3/b4
    expect(result.unallocatedSizeAcres).toBe(2);
    expect(result.allocationPercent).toBe(80);
    expect(result.totalTrees).toBe(150); // 100 + 50, not b3's 30 or the superseded 20
    expect(result.productiveTrees).toBe(120);
    expect(result.varietyTotals).toEqual({ Kent: 100, Keitt: 50 });
    expect(result.blockCounts).toEqual({ active: 2, inactive: 1, merged: 1, archived: 0, total: 4 });
  });

  it('groups tree totals by variety across multiple blocks sharing a variety', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: null,
      blocks: [{ id: 'b1', status: 'active', size_acres: 5 }, { id: 'b2', status: 'active', size_acres: 5 }],
      inventories: [
        { block_id: 'b1', crop_variety_id: 'kent', variety_name: 'Kent', total_trees: 40, productive_trees: 40, effective_to: null },
        { block_id: 'b2', crop_variety_id: 'kent', variety_name: 'Kent', total_trees: 60, productive_trees: 60, effective_to: null },
      ],
      yieldRecords: [],
      harvestPeriods: [],
      activityPeriods: [],
    });
    expect(result.varietyTotals).toEqual({ Kent: 100 });
    expect(result.unallocatedSizeAcres).toBeNull(); // no declared farm size
  });

  it('sums yield from all provided records regardless of block status (historical yield keeps counting)', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: 10,
      blocks: baseBlocks,
      inventories: baseInventories,
      yieldRecords: [
        { actual_yield_kg: 100, forecast_yield_kg: 120 },
        { actual_yield_kg: 50, forecast_yield_kg: 40 }, // e.g. a pre-merge record on a now-merged block
      ],
      harvestPeriods: [],
      activityPeriods: [],
    });
    expect(result.totalYieldKg).toBe(150);
    expect(result.forecastYieldKg).toBe(160);
    expect(result.yieldPerAcre).toBeCloseTo(150 / 8);
    expect(result.yieldPerProductiveTree).toBeCloseTo(150 / 120);
  });

  it('computes a single current activity stage when all active blocks share it', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: 10,
      blocks: [{ id: 'b1', status: 'active', size_acres: 5 }, { id: 'b2', status: 'active', size_acres: 5 }],
      inventories: [],
      yieldRecords: [],
      harvestPeriods: [],
      activityPeriods: [
        { block_id: 'b1', activity_type: 'pruning', status: 'in_progress' },
        { block_id: 'b2', activity_type: 'pruning', status: 'in_progress' },
      ],
    });
    expect(result.mixedActivityStages).toBe(false);
    expect(result.currentActivityStage).toBe('pruning');
  });

  it('reports mixed stages with a full distribution when active blocks are in different stages', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: 10,
      blocks: [
        { id: 'b1', status: 'active', size_acres: 5 },
        { id: 'b2', status: 'active', size_acres: 5 },
        { id: 'b3', status: 'active', size_acres: 5 },
      ],
      inventories: [],
      yieldRecords: [],
      harvestPeriods: [],
      activityPeriods: [
        { block_id: 'b1', activity_type: 'pruning', status: 'in_progress' },
        { block_id: 'b2', activity_type: 'harvesting', status: 'in_progress' },
        // b3 has no in-progress activity at all
      ],
    });
    expect(result.mixedActivityStages).toBe(true);
    expect(result.currentActivityStage).toBeNull();
    expect(result.activityStageDistribution).toEqual({ pruning: 1, harvesting: 1, none: 1 });
  });

  it('builds a harvest-type distribution from harvest period counts', () => {
    const result = computeFarmAnalytics({
      farmSizeAcres: null,
      blocks: [],
      inventories: [],
      yieldRecords: [],
      harvestPeriods: [
        { harvest_type: 'early_harvest', status: 'active' },
        { harvest_type: 'early_harvest', status: 'completed' },
        { harvest_type: 'major_harvest', status: 'planned' },
      ],
      activityPeriods: [],
    });
    expect(result.harvestTypeDistribution).toEqual({ early_harvest: 2, major_harvest: 1 });
  });
});

describe('checkFarmSizeAllocation', () => {
  it('allows allocation exactly at the declared farm size', () => {
    const result = checkFarmSizeAllocation({ farmSizeAcres: 10, currentlyAllocatedAcres: 6, incomingSizeAcres: 4, allowOverride: false });
    expect(result).toMatchObject({ allowed: true, exceeds: false, projectedAcres: 10 });
  });

  it('rejects allocation one unit over the declared size without an override', () => {
    const result = checkFarmSizeAllocation({ farmSizeAcres: 10, currentlyAllocatedAcres: 6, incomingSizeAcres: 4.5, allowOverride: false });
    expect(result).toMatchObject({ allowed: false, exceeds: true, projectedAcres: 10.5 });
  });

  it('permits exceeding the declared size when an explicit override is set', () => {
    const result = checkFarmSizeAllocation({ farmSizeAcres: 10, currentlyAllocatedAcres: 6, incomingSizeAcres: 4.5, allowOverride: true });
    expect(result).toMatchObject({ allowed: true, exceeds: true });
  });

  it('never flags an exceedance when the farm has no declared size', () => {
    const result = checkFarmSizeAllocation({ farmSizeAcres: null, currentlyAllocatedAcres: 1000, incomingSizeAcres: 1000, allowOverride: false });
    expect(result).toMatchObject({ allowed: true, exceeds: false });
  });
});

describe('isMergeEligible', () => {
  const active = (id: string, farmId: string) => ({ id, farm_id: farmId, status: 'active' });

  it('accepts source and destination blocks that are all active and share a farm', () => {
    const result = isMergeEligible('farm-1', [active('b1', 'farm-1'), active('b2', 'farm-1')], active('b3', 'farm-1'));
    expect(result).toEqual({ eligible: true, reason: null });
  });

  it('rejects a cross-farm merge', () => {
    const result = isMergeEligible('farm-1', [active('b1', 'farm-1')], active('b2', 'farm-2'));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/same farm/i);
  });

  it('rejects merging a block into itself', () => {
    const result = isMergeEligible('farm-1', [active('b1', 'farm-1')], active('b1', 'farm-1'));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/cannot also be a source/i);
  });

  it('rejects an inactive source block', () => {
    const result = isMergeEligible('farm-1', [{ id: 'b1', farm_id: 'farm-1', status: 'merged' }], active('b2', 'farm-1'));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/source blocks must be active/i);
  });

  it('rejects an inactive destination block', () => {
    const result = isMergeEligible('farm-1', [active('b1', 'farm-1')], { id: 'b2', farm_id: 'farm-1', status: 'archived' });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/destination block must be active/i);
  });

  it('rejects a merge with no source blocks', () => {
    const result = isMergeEligible('farm-1', [], active('b2', 'farm-1'));
    expect(result.eligible).toBe(false);
  });
});
