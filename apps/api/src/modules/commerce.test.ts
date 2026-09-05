import { describe, expect, it } from 'vitest';
import { COMMERCE_CATALOG, priceOrder, publicOrderTrackingView } from './commerce.js';

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

  it('limits the guest tracking response to fulfillment-safe fields', () => {
    const tracked = publicOrderTrackingView({
      order_number: 'JBA-20260904-ABC123', status: 'packed', total_amount: 75,
      customer_name: 'Private Customer', customer_email: 'private@example.com', contact_phone: '+233200000000',
      shipping_address: { address: 'Private street', city: 'Accra', region: 'Greater Accra' },
      delivery_notes: 'Private note', payment_method: 'bank_transfer', payment_status: 'pending',
      items: [{ product_id: 'dried-mango', product_name: 'Dried Mango', quantity: 2, unit_price: 25, line_total: 50 }],
      status_history: [{ status: 'packed', label: 'Packed', timestamp: '2026-09-04T10:00:00.000Z', note: 'Ready for dispatch' }],
    }, new Date('2026-09-04T09:00:00.000Z'), new Date('2026-09-04T10:00:00.000Z'));

    expect(tracked).toMatchObject({ order_number: 'JBA-20260904-ABC123', status: 'packed' });
    expect(tracked.status_history[0]).not.toHaveProperty('note');
    expect(tracked).not.toHaveProperty('customer_name');
    expect(tracked).not.toHaveProperty('customer_email');
    expect(tracked).not.toHaveProperty('contact_phone');
    expect(tracked).not.toHaveProperty('shipping_address');
    expect(tracked).not.toHaveProperty('delivery_notes');
    expect(tracked).not.toHaveProperty('payment_method');
    expect(tracked).not.toHaveProperty('payment_status');
    expect(tracked).not.toHaveProperty('items');
    expect(tracked).not.toHaveProperty('total_amount');
  });
});
