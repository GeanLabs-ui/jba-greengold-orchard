import { describe, expect, it } from 'vitest';
import { assertExistingRowsPreserved } from './business-data-preservation.mjs';

describe('business data preservation across additive schema changes', () => {
  const before = [{ row: { id: 'block-1', name: 'Existing block', tree_count: 40 } }];
  it('accepts new columns and new records while preserving every baseline value', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [
      { row: { ...before[0].row, image_url: null } },
      { row: { id: 'block-2', name: 'New block', tree_count: 10, image_url: null } },
    ])).not.toThrow();
  });
  it('rejects changed values even when a column was added', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [{ row: { ...before[0].row, tree_count: 0, image_url: null } }])).toThrow('farm_blocks');
  });
  it('rejects removed columns and deleted or missing duplicate records', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [{ row: { id: 'block-1', name: 'Existing block' } }])).toThrow();
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [])).toThrow();
    expect(() => assertExistingRowsPreserved('farm_blocks', [...before, ...before], before)).toThrow();
  });
  it('accepts several added columns containing nulls and defaults', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [
      { row: { ...before[0].row, image_url: null, active: true, count: 0, tags: [] } },
    ])).not.toThrow();
  });
  it('rejects a removed original column whose value was null', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', [{ row: { id: 'block-1', image_url: null } }], [
      { row: { id: 'block-1' } },
    ])).toThrow('farm_blocks');
  });
  it('rejects changes to scalar types', () => {
    expect(() => assertExistingRowsPreserved('farm_blocks', before, [
      { row: { ...before[0].row, tree_count: '40', image_url: null } },
    ])).toThrow('farm_blocks');
  });
  it.each([
    { value: 1, added: null },
    {},
    { value: 2 },
  ])('rejects nested JSONB additions, removals and changes: %j', data => {
    expect(() => assertExistingRowsPreserved('entity_records', [{ row: { id: 'record-1', data: { value: 1 } } }], [
      { row: { id: 'record-1', data, new_column: null } },
    ])).toThrow('entity_records');
  });
  it('accepts reordered rows and object keys', () => {
    const another = { row: { id: 'block-2', name: 'Another block', tree_count: 20 } };
    expect(() => assertExistingRowsPreserved('farm_blocks', [...before, another], [
      { row: { tree_count: 20, name: 'Another block', id: 'block-2', image_url: null } },
      { row: { tree_count: 40, name: 'Existing block', id: 'block-1', image_url: null } },
    ])).not.toThrow();
  });
  it('counts identical rows separately after additive schema changes', () => {
    const after = [{ row: { ...before[0].row, image_url: null } }];
    expect(() => assertExistingRowsPreserved('farm_blocks', [...before, ...before], after)).toThrow('farm_blocks');
    expect(() => assertExistingRowsPreserved('farm_blocks', [...before, ...before], [...after, ...after])).not.toThrow();
  });
});
