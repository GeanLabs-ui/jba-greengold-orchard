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
});
