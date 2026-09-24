import { describe, expect, it } from 'vitest';
import { BLOCK_CODES, FARM_SCOPE_OPTIONS, activityScopeValue, blockLabel, expandedScopeCodes, farmScopeOptions, matchesFarmScope, resolveOperationalScope } from './farm-scope';
import { buildFarmOperationsAnalytics } from './farm-operations-analytics';

const farms = [{ id: 'farm-b', name: 'Farm Land B' }, { id: 'farm-a', name: 'Farm Land A' }];
const blocks = BLOCK_CODES.map((code) => ({ id: `id-${code}`, name: `Block ${code}`, block_code: code, farm_id: `farm-${code[0].toLowerCase()}`, tree_count: 10 }));
const structure = { farms, blocks };

describe('admin farm scopes', () => {
  it('expands legacy and current checkbox selections in a stable order', () => {
    expect(expandedScopeCodes('Farm A')).toEqual(BLOCK_CODES.slice(0, 5));
    expect(expandedScopeCodes('Farm A & B')).toEqual(BLOCK_CODES);
    expect(expandedScopeCodes('B3, Block A1, A1')).toEqual(['A1', 'B3']);
    expect(expandedScopeCodes('')).toEqual([]);
  });
  it('restores saved whole-farm and multi-block selections in the editor', () => {
    expect(activityScopeValue({ farm_id: 'farm-a', block_name: 'Farm A' })).toBe('farm:farm-a');
    expect(activityScopeValue({ farm_name: 'Farm A&B', shared_scope: 'Farm A&B' })).toBe('__all__');
    expect(activityScopeValue({ farm_name: 'Farm A&B', shared_scope: 'A1, B3' })).toBe('__shared__');
    expect(activityScopeValue({ block_id: 'id-A1', shared_scope: 'A1' })).toBe('id-A1');
  });
  it('orders the two farms and combined summary before exactly ten concise blocks', () => {
    const options = farmScopeOptions(farms, [...blocks.slice().reverse(), { id: 'old-a6', name: 'Block A6', farm_id: 'farm-a' }]);
    expect(options.map((option) => option.label)).toEqual(FARM_SCOPE_OPTIONS.map((option) => option.label));
    expect(options[0].value).toBe('farm:farm-a');
    expect(options[3].value).toBe('block:id-A1');
  });
  it('normalizes historical block prefixes and preserves multi-block scopes', () => {
    for (const name of ['Farm Block A1', 'Farm A1', 'Block A1', 'A1']) expect(blockLabel(name)).toBe('A1');
    expect(blockLabel('Block A1, Block B2')).toBe('A1, B2');
  });
  it('includes all five child blocks using IDs and excludes the other farm', () => {
    const rows = blocks.map((block) => ({ block_id: block.id }));
    expect(rows.filter((row) => matchesFarmScope(row, 'A', structure))).toHaveLength(5);
    expect(rows.filter((row) => matchesFarmScope(row, 'B', structure))).toHaveLength(5);
    expect(rows.filter((row) => matchesFarmScope(row, 'all', structure))).toHaveLength(10);
    expect(rows.filter((row) => matchesFarmScope(row, 'B3', structure))).toEqual([{ block_id: 'id-B3' }]);
  });
  it('matches both farms for historical shared rows without assigning their cost to one block', () => {
    const shared = { farm_name: 'Farm A & B' };
    expect(matchesFarmScope(shared, 'A', structure)).toBe(true);
    expect(matchesFarmScope(shared, 'B', structure)).toBe(true);
    expect(matchesFarmScope(shared, 'A1', structure)).toBe(false);
  });
  it('uses explicit block membership before an aggregate farm label', () => {
    const record = { farm_name: 'Farm A&B', block_name: 'A1, A2', shared_scope: 'A1, A2' };
    expect(matchesFarmScope(record, 'A', structure)).toBe(true);
    expect(matchesFarmScope(record, 'B', structure)).toBe(false);
    expect(matchesFarmScope(record, 'A3', structure)).toBe(false);
  });
  it('includes a multi-block activity once in each selected block report', () => {
    const shared = { farm_name: 'Farm A&B', block_name: 'A1, B3', shared_scope: 'A1, B3', actual_cost: 25 };
    expect(buildFarmOperationsAnalytics({ ...structure, dailyActivities: [shared] }, { blockId: 'id-A1' }).totalCost).toBe(25);
    expect(buildFarmOperationsAnalytics({ ...structure, dailyActivities: [shared] }, { blockId: 'id-B3' }).totalCost).toBe(25);
    expect(buildFarmOperationsAnalytics({ ...structure, dailyActivities: [shared] }, { blockId: 'id-A2' }).totalCost).toBe(0);
    expect(buildFarmOperationsAnalytics({ ...structure, dailyActivities: [shared] }).totalCost).toBe(25);
  });
  it('resolves whole-farm, combined, and block form selections without storing synthetic IDs', () => {
    expect(resolveOperationalScope({ block_id: 'farm:farm-a' }, farms, blocks)).toMatchObject({ farm_id: 'farm-a', farm_name: 'Farm A', block_id: '', block_name: 'Farm A' });
    expect(resolveOperationalScope({ block_id: '__all__' }, farms, blocks)).toMatchObject({ farm_id: '', farm_name: 'Farm A&B', block_id: '', shared_scope: 'Farm A&B' });
    expect(resolveOperationalScope({ block_id: 'id-B4' }, farms, blocks)).toMatchObject({ farm_id: 'farm-b', farm_name: 'Farm B', block_id: 'id-B4', block_name: 'B4' });
    expect(() => resolveOperationalScope({ farm_id: 'farm-a', block_id: 'id-B4' }, farms, blocks)).toThrow('belonging');
  });
  it('sums all ten blocks and a shared record once in the combined analytics', () => {
    const dailyActivities = [...blocks.map((block) => ({ block_id: block.id, actual_cost: 10 })), { farm_name: 'Farm A&B', actual_cost: 25 }];
    const combined = buildFarmOperationsAnalytics({ ...structure, dailyActivities });
    expect(combined.visibleBlocks).toHaveLength(10);
    expect(combined.totalTrees).toBe(100);
    expect(combined.totalCost).toBe(125);
    const farmA = buildFarmOperationsAnalytics({ ...structure, dailyActivities }, { farmId: 'farm-a' });
    expect(farmA.visibleBlocks).toHaveLength(5);
    expect(farmA.totalCost).toBe(75);
  });
});
