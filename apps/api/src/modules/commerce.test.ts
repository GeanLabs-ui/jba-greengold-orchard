import { describe, expect, it } from 'vitest';
import { COMMERCE_CATALOG, priceOrder } from './commerce.js';

describe('commerce order pricing', () => {
  it('prices catalog lines on the server and applies the delivery threshold', () => {
    const small = priceOrder([{ product_id: 'dried-mango', quantity: 2 }]);
    const large = priceOrder([{ product_id: 'gift-pack-large', quantity: 2 }]);

    expect(small).toMatchObject({ subtotal: 50, deliveryFee: 25, total: 75 });
    expect(small.lines[0]).toMatchObject({ product_name: 'Dried Mango', unit_price: 25, line_total: 50 });
    expect(large).toMatchObject({ subtotal: 320, deliveryFee: 0, total: 320 });
  });

  it('contains every storefront product in the canonical checkout catalog', () => {
    expect(Object.keys(COMMERCE_CATALOG)).toHaveLength(12);
  });
});
