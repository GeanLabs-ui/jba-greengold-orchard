import { describe, expect, it } from 'vitest';
import { mergeCatalog } from './catalog';

describe('catalog ordering', () => {
  it('shows newest first on admin and public catalogs, regardless of edits or input order', () => {
    const records = [
      { id: 'older', storefront: true, name: 'Older', price: 20, status: 'published', created_date: '2026-09-14T10:00:00Z', updated_date: '2026-09-17T10:00:00Z' },
      { id: 'draft', storefront: true, name: 'Draft', price: 20, status: 'draft', created_date: '2026-09-16T10:00:00Z' },
      { id: 'newest', storefront: true, name: 'Newest', price: 20, status: 'published', created_date: '2026-09-15T10:00:00Z' },
    ];
    expect(mergeCatalog(records).slice(0, 2).map(product => product.id)).toEqual(['newest', 'older']);
    expect(mergeCatalog(records, true).slice(0, 3).map(product => product.id)).toEqual(['draft', 'newest', 'older']);
    expect(mergeCatalog([...records].reverse()).map(product => product.id)).toEqual(mergeCatalog(records).map(product => product.id));
  });

  it('keeps undated products stable behind dated records', () => {
    const baseline = mergeCatalog([]).map(product => product.id);
    const products = mergeCatalog([
      { id: 'new', storefront: true, name: 'New', price: 10, status: 'published', created_date: '2026-09-16T10:00:00Z' },
      { id: 'legacy', storefront: true, name: 'Legacy', price: 10, status: 'published', created_date: 'invalid' },
    ]);
    expect(products.map(product => product.id)).toEqual(['new', ...baseline, 'legacy']);
  });
});
