import { describe, expect, it } from 'vitest';
import { basketPage } from './basket-pagination';

const lines = Array.from({ length: 12 }, (_, id) => ({ id, quantity: 1 }));

describe('basket pages instead of vertical scrolling', () => {
  it.each([1, 2, 3, 4, 5, 6, 12])('keeps every product reachable with %i visible rows', (size) => {
    const seen = [];
    const first = basketPage(lines, 0, size);
    for (let page = 0; page < first.pageCount; page += 1) {
      const result = basketPage(lines, page, size);
      expect(result.items.length).toBeLessThanOrEqual(size);
      seen.push(...result.items);
    }
    expect(seen).toEqual(lines);
  });

  it('clamps the page after products are removed or the viewport grows', () => {
    expect(basketPage(lines.slice(0, 2), 5, 4)).toMatchObject({ page: 0, pageCount: 1, start: 0, end: 2 });
    expect(basketPage(lines, 11, 6)).toMatchObject({ page: 1, pageCount: 2, start: 6, end: 12 });
  });

  it('handles an empty basket and invalid page sizes', () => {
    expect(basketPage([], 2, 0)).toMatchObject({ page: 0, pageCount: 1, start: 0, end: 0, items: [] });
  });
});
