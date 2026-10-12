import { describe, expect, it } from 'vitest';
import {
  canChangeBlockStatus,
  canManageBlocks,
  canManageFarms,
  canMergeBlocks,
  farmLocationOptions,
  farmVarietyOptions,
  groupYieldRecords,
} from './farm-management';

describe('farm management helpers', () => {
  it('groups normalized yield records without duplicating totals', () => {
    const records = [
      { record_date: '2026-01-03', actual_yield_kg: 10, forecast_yield_kg: 12 },
      { record_date: '2026-01-24', actual_yield_kg: 5, forecast_yield_kg: 6 },
      { record_date: '2026-02-02', actual_yield_kg: 8, forecast_yield_kg: 9 },
    ];
    expect(groupYieldRecords(records, 'monthly')).toEqual([
      { date: '2026-01-01', actual: 15, forecast: 18 },
      { date: '2026-02-01', actual: 8, forecast: 9 },
    ]);
  });

  it('uses Monday as the start of a reporting week', () => {
    expect(groupYieldRecords([
      { record_date: '2026-01-04', actual_yield_kg: 2 },
      { record_date: '2026-01-05', actual_yield_kg: 3 },
    ], 'weekly')).toEqual([
      { date: '2025-12-29', actual: 2, forecast: 0 },
      { date: '2026-01-05', actual: 3, forecast: 0 },
    ]);
  });

  it('keeps destructive farm and block actions role-scoped', () => {
    expect(canManageFarms('farm_supervisor')).toBe(false);
    expect(canManageBlocks('farm_supervisor')).toBe(true);
    expect(canChangeBlockStatus('farm_supervisor')).toBe(false);
    expect(canMergeBlocks('farm_manager')).toBe(false);
    expect(canMergeBlocks('admin')).toBe(true);
  });

  it('builds complete farm and block location filter options', () => {
    expect(farmLocationOptions([
      { location: 'Keta', region: 'Volta', block_locations: ['Anloga', 'Keta'] },
      { location: 'Ada', region: 'Greater Accra', block_locations: ['Big Ada'] },
    ])).toEqual(['Ada', 'Anloga', 'Big Ada', 'Greater Accra', 'Keta', 'Volta']);
  });

  it('combines normalized inventory and legacy block variety options', () => {
    expect(farmVarietyOptions([
      { variety_totals: { Kent: 120 }, block_varieties: ['Keitt', 'Kent'] },
      { variety_totals: {}, block_varieties: ['Black Pearl'] },
    ])).toEqual(['Black Pearl', 'Keitt', 'Kent']);
  });
});
