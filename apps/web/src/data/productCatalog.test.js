import { describe, expect, it } from 'vitest';
import { PRODUCT_BY_ID, PRODUCT_CATALOG } from './productCatalog';

describe('storefront product catalog', () => {
  it('keeps all twelve purchasable products uniquely addressable', () => {
    expect(PRODUCT_CATALOG).toHaveLength(12);
    expect(new Set(PRODUCT_CATALOG.map((product) => product.id)).size).toBe(12);
    expect(Object.keys(PRODUCT_BY_ID)).toHaveLength(12);
  });

  it('provides a valid checkout price and image for every product', () => {
    PRODUCT_CATALOG.forEach((product) => {
      expect(product.price).toBeGreaterThan(0);
      expect(product.image).toMatch(/^\/products\//);
    });
  });
});
