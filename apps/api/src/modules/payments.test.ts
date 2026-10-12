import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createDatabase, type Database } from '../db.js';
import type { AppVariables, AuthUser } from '../middleware/auth.js';
import payments, { settlePayment } from './payments.js';
import type { Attempt, VerifiedPayment } from './payment-gateways.js';

vi.mock('../db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
vi.mock('../rate-limit.js', () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }));
const reference = 'jba-11111111-1111-1111-1111-111111111111';
const env = { APP_ENV: 'local' } as Env;
const attempt: Attempt = { order_id: 'order-1', reference, provider: 'paystack', method: 'card', country: 'GH', currency: 'GHS', amount_minor: 7500, email: 'customer@example.test', status: 'pending', created_at: new Date().toISOString() };
const row = { id: reference, owner_user_id: 'user-1', organization_id: null, data: attempt };
const verified: VerifiedPayment = { reference, order_id: 'order-1', amount_minor: 7500, currency: 'GHS', paid: true, terminal: false, transaction_id: 'txn-1' };

function app(signedIn = false) {
  const instance = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  instance.use('*', async (c, next) => {
    c.set('user', signedIn ? { id: 'user-1', email: attempt.email, organizationId: null, role: 'customer', status: 'active', full_name: 'Customer', pageAccess: null } as AuthUser : null);
    c.set('session', signedIn ? { id: 'session', csrfToken: 'csrf-token', expiresAt: new Date(Date.now() + 60000) } : null);
    await next();
  });
  instance.route('/', payments);
  return instance;
}

function settlementDatabase({ paid = false, partial = false, total = 75 } = {}) {
  let settled = paid;
  const calls: string[] = [];
  const sql: any = vi.fn(async (strings: TemplateStringsArray, ..._values: unknown[]) => {
    const query = strings.join('?');
    calls.push(query);
    if (query.startsWith('SELECT') && query.includes("entity_name = 'Order'")) return [{ id: 'order-1', owner_user_id: 'user-1', data: { currency: 'GHS', total_amount: total, payment_status: settled ? 'paid' : 'pending' } }];
    if (query.startsWith('SELECT') && query.includes("entity_name = 'PaymentAttempt'")) return [{ ...row, data: { ...attempt, status: settled ? 'paid' : 'pending' } }];
    if (query.startsWith('SELECT') && query.includes("entity_name = 'Invoice'")) return [{ id: 'invoice-1', data: { currency: 'GHS', total_amount: 75, amount_paid: partial ? 25 : 0, invoice_number: 'INV-1' } }];
    if (query.startsWith('UPDATE') && query.includes("entity_name = 'PaymentAttempt'")) settled = true;
    return [];
  });
  sql.json = (value: unknown) => value;
  sql.begin = (fn: (tx: unknown) => unknown) => fn(sql);
  return { sql: sql as Database, calls };
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('checkout session persistence', () => {
  it('reserves before contacting Paystack, ignores client amounts and reuses the active session', async () => {
    const order: any = { id: 'order-1', owner_user_id: 'user-1', organization_id: null, data: { source: 'website', currency: 'GHS', total_amount: 75, status: 'confirmed', payment_status: 'pending' } };
    let stored: any = null;
    const sql: any = vi.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?');
      if (query.startsWith('SELECT') && query.includes("entity_name = 'Order'")) return [order];
      if (query.startsWith('SELECT') && query.includes("entity_name = 'Invoice'")) return [{ id: 'invoice-1', data: { total_amount: 75, amount_paid: 0, currency: 'GHS', status: 'unpaid' } }];
      if (query.startsWith('SELECT') && query.includes("entity_name = 'PaymentAttempt'")) return stored ? [stored] : [];
      if (query.startsWith('INSERT INTO entity_records')) stored = { id: values[0], organization_id: values[1], owner_user_id: values[2], data: values[3] };
      if (query.startsWith('UPDATE') && query.includes("entity_name = 'Order'")) order.data = { ...order.data, ...values[0] };
      if (query.startsWith('UPDATE') && query.includes("entity_name = 'PaymentAttempt'")) stored.data = { ...stored.data, ...values[0], status: 'pending' };
      return [];
    });
    sql.json = (value: unknown) => value;
    sql.begin = (callback: (tx: any) => unknown) => callback(sql);
    vi.mocked(createDatabase).mockReturnValue(sql);
    const fetcher = vi.fn(async (url: string) => {
      expect(stored).not.toBeNull();
      expect(order.data.payment_attempt_id).toBe(stored.id);
      return url.includes('/initialize')
        ? Response.json({ status: true, data: { reference: stored.id, authorization_url: 'https://checkout.paystack.com/saved' } })
        : Response.json({ status: true, data: { reference: stored.id, metadata: { order_id: 'order-1' }, amount: 7500, currency: 'GHS', status: 'pending', id: 1 } });
    });
    vi.stubGlobal('fetch', fetcher);
    const configured = { ...env, ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:8788', PAYMENT_RETURN_ORIGIN: 'http://localhost:5173', PAYMENTS_ENABLED: 'true', PAYSTACK_SECRET_KEY: 'test-secret', PAYSTACK_MERCHANT_COUNTRY: 'GH', PAYSTACK_CURRENCIES: 'GHS' } as Env;
    const request = () => app(true).request('/orders/order-1/session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' }, body: JSON.stringify({ provider: 'paystack', method: 'card', country: 'GH', amount: 1, currency: 'USD' }) }, configured);
    const first = await request();
    expect(first.status).toBe(200);
    expect(stored.data.amount_minor).toBe(7500);
    expect(stored.data.currency).toBe('GHS');
    const second = await request();
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ data: { reference: stored.id, checkout_url: 'https://checkout.paystack.com/saved' } });
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/initialize'))).toHaveLength(1);
  });
});

describe('payment endpoint access', () => {
  it('returns configuration-free options without secrets or database access', async () => {
    const response = await app().request('/options?country=TG', {}, env);
    const payload = await response.json() as any;
    expect(payload.data.options.every((option: any) => !option.available)).toBe(true);
    expect(createDatabase).not.toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain('SECRET');
  });
  it('requires authentication and CSRF before payment initiation', async () => {
    expect((await app().request('/orders/order-1/session', { method: 'POST' }, env)).status).toBe(401);
    expect((await app(true).request('/orders/order-1/session', { method: 'POST' }, env)).status).toBe(403);
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it('rejects unsigned webhooks before database access', async () => {
    expect((await app().request('/webhooks/paystack', { method: 'POST', body: '{"event":"charge.success"}' }, env)).status).toBe(400);
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it('prevents one customer verifying another customer payment', async () => {
    vi.mocked(createDatabase).mockReturnValue(vi.fn().mockResolvedValue([{ ...row, owner_user_id: 'someone-else' }]) as unknown as Database);
    const response = await app(true).request(`/attempts/${reference}/verify`, { method: 'POST', headers: { 'X-CSRF-Token': 'csrf-token' } }, env);
    expect(response.status).toBe(404);
  });
});

describe('verified settlement', () => {
  it('applies exactly one receipt on callback/webhook replay', async () => {
    const { sql, calls } = settlementDatabase();
    expect(await settlePayment(sql, row, verified)).toBe('paid');
    expect(await settlePayment(sql, row, verified)).toBe('paid');
    expect(calls.filter((query) => query.includes("'Payment',"))).toHaveLength(1);
    expect(calls.filter((query) => query.startsWith('INSERT INTO audit_events'))).toHaveLength(1);
    expect(calls.some((query) => query.includes("entity_name = 'Order'") && query.includes('FOR UPDATE'))).toBe(true);
  });
  it('does not credit unpaid or pending provider results', async () => {
    const { sql, calls } = settlementDatabase();
    expect(await settlePayment(sql, row, { ...verified, paid: false })).toBe('pending');
    expect(calls.some((query) => query.startsWith('UPDATE') || query.startsWith('INSERT'))).toBe(false);
  });
  it.each([{ amount_minor: 1 }, { currency: 'USD' }, { reference: 'attacker' }, { order_id: 'other-order' }])('rejects mismatched verification before writes: %j', async (change) => {
    const { sql, calls } = settlementDatabase();
    await expect(settlePayment(sql, row, { ...verified, ...change })).rejects.toThrow('did not match');
    expect(calls).toHaveLength(0);
  });
  it.each([{ total: 80 }, { partial: true }])('holds changed or partially paid invoices for review: %j', async (scenario) => {
    const { sql, calls } = settlementDatabase(scenario);
    await expect(settlePayment(sql, row, verified)).rejects.toThrow();
    expect(calls.some((query) => query.startsWith('UPDATE') || query.startsWith('INSERT'))).toBe(false);
  });
});
