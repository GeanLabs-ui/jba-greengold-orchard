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

  it('registers a browser-local preview administrator', async () => {
    const result = await demoBase44.auth.register({
      email: 'owner@example.com',
      password: 'a-secure-preview-password',
    });

    expect(result.user).toMatchObject({ email: 'owner@example.com', role: 'super_admin' });
    await expect(demoBase44.auth.me()).resolves.toMatchObject({ email: 'owner@example.com' });
  });

  it('provides seeded dashboard data and browser-local entity writes', async () => {
    await expect(demoBase44.entities.Order.list()).resolves.toHaveLength(2);

    const record = await demoBase44.entities.Order.create({ order_number: 'ORD-DEMO' });
    await expect(demoBase44.entities.Order.filter({ id: record.id })).resolves.toHaveLength(1);
  });
});
