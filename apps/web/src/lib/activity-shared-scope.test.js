import { describe, expect, it } from 'vitest';
import { resolveActivitySharedScope } from './activity-shared-scope';

const blocks = [1, 2, 3].map((n) => ({ id: `a${n}`, name: `Block A${n}`, farm_id: 'farm-a', farm_name: 'Farm A' }));
describe('historical activity scope', () => {
  it('keeps a shared expense on its farm without assigning its entire cost to one block', () => {
    expect(resolveActivitySharedScope({ block_id: '__shared__', shared_scope: 'A1, A2, A3' }, blocks))
      .toEqual({ farm_id: 'farm-a', farm_name: 'Farm A', block_id: '', block_name: 'Block A1, Block A2, Block A3' });
  });
  it('does not assign a cross-farm expense to a single farm', () => {
    expect(resolveActivitySharedScope({ block_id: '__shared__', shared_scope: 'Farm A & B' }, blocks))
      .toEqual({ farm_id: '', farm_name: 'Farm A & B', block_id: '', block_name: 'Farm A & B' });
  });
  it('rejects unknown blocks before creating a record', () => {
    expect(() => resolveActivitySharedScope({ block_id: '__shared__', shared_scope: 'A9' }, blocks)).toThrow('configured block');
  });
  it('leaves ordinary block selection unchanged', () => {
    expect(resolveActivitySharedScope({ block_id: 'a1' }, blocks)).toBeNull();
  });
});
