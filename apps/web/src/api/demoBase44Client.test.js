import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CREDENTIALS, demoBase44 } from './demoBase44Client';

const storage = new Map();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key),
    setItem: (key, value) => storage.set(key, String(value)),
  },
});

describe('preview demo client', () => {
  beforeEach(() => localStorage.clear());

  it('logs in with the shared demo administrator credentials', async () => {
    const user = await demoBase44.auth.loginViaEmailPassword(
      DEMO_CREDENTIALS.email,
      DEMO_CREDENTIALS.password,
    );

    expect(user.role).toBe('super_admin');
    await expect(demoBase44.auth.me()).resolves.toMatchObject({ email: DEMO_CREDENTIALS.email });
  });

  it('registers a browser-local preview customer', async () => {
    const result = await demoBase44.auth.register({
      email: 'owner@example.com',
      password: 'a-secure-preview-password',
    });

    expect(result.user).toMatchObject({ email: 'owner@example.com', role: 'customer' });
    await expect(demoBase44.auth.me()).resolves.toMatchObject({ email: 'owner@example.com' });
  });

  it('creates an owner-scoped website order with server-equivalent pricing', async () => {
    const result = await demoBase44.auth.register({
      email: 'shopper@example.com',
      password: 'a-secure-preview-password',
    });
    const order = await demoBase44.commerce.checkoutOrder({
      items: [{ product_id: 'dried-mango', quantity: 2 }],
      shipping: {
        full_name: 'Preview Shopper',
        email: 'shopper@example.com',
        phone: '+233200000000',
        address: '1 Mango Lane',
        city: 'Accra',
        region: 'Greater Accra',
      },
      payment_method: 'cash_on_delivery',
    });

    expect(order).toMatchObject({ owner_user_id: result.user.id, subtotal_amount: 50, delivery_fee: 25, total_amount: 75 });
    await expect(demoBase44.commerce.myOrders()).resolves.toHaveLength(1);
    await expect(demoBase44.entities.Invoice.filter({ order_number: order.order_number })).resolves.toMatchObject([
      { customer_name: 'Preview Shopper', balance_due: 75, status: 'unpaid' },
    ]);
    await expect(demoBase44.entities.Customer.filter({ email: 'shopper@example.com' })).resolves.toHaveLength(1);
    await expect(demoBase44.entities.Notification.filter({ order_number: order.order_number })).resolves.toMatchObject([
      { title: 'New website sale', status: 'new' },
    ]);
  });

  it('provides seeded dashboard data and browser-local entity writes', async () => {
    await expect(demoBase44.entities.Order.list()).resolves.toHaveLength(2);

    const record = await demoBase44.entities.Order.create({ order_number: 'ORD-DEMO' });
    await expect(demoBase44.entities.Order.filter({ id: record.id })).resolves.toHaveLength(1);
  });

  it('routes a website inquiry into the client inquiry queue and notifications', async () => {
    const inquiry = await demoBase44.entities.Inquiry.create({
      name: 'Ama Client',
      email: 'ama@example.com',
      subject: 'Export pricing',
      message: 'Please send the current export price list.',
      inquiry_type: 'export',
    });

    expect(inquiry).toMatchObject({ status: 'new', source_page: 'contact' });
    await expect(demoBase44.entities.Notification.filter({ inquiry_id: inquiry.id })).resolves.toMatchObject([
      { title: 'New client inquiry', destination: `/admin/inquiries?inquiry=${inquiry.id}`, status: 'new' },
    ]);
  });
});
