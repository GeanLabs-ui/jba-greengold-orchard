import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPaymentOption, hmac, initializePayment, matchesPayment, minorAmount, paymentOptions, returnOrigin, safeCheckoutUrl, validWebhook, verifyPayment, type Attempt } from './payment-gateways.js';

const env = { APP_ENV: 'local', ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:8788', PAYMENT_RETURN_ORIGIN: 'http://localhost:5173', PAYMENTS_ENABLED: 'true', PAYSTACK_SECRET_KEY: 'test-paystack-secret', PAYSTACK_MERCHANT_COUNTRY: 'GH', PAYSTACK_CURRENCIES: 'GHS', STRIPE_SECRET_KEY: 'test-stripe-secret', STRIPE_WEBHOOK_SECRET: 'test-webhook-secret', STRIPE_CURRENCIES: 'GHS' } as Env;
const attempt: Attempt = { order_id: 'order-1', reference: 'jba-11111111-1111-1111-1111-111111111111', provider: 'paystack', method: 'mobile_money', country: 'GH', currency: 'GHS', amount_minor: 7500, email: 'customer@example.test', status: 'initializing', created_at: new Date().toISOString() };
afterEach(() => vi.unstubAllGlobals());

describe('payment capability gating', () => {
  it('disables every online method until credentials, currencies and enablement are present', () => {
    for (const disabled of [{}, { ...env, PAYMENTS_ENABLED: 'false' }, { ...env, PAYSTACK_SECRET_KEY: '', STRIPE_SECRET_KEY: '' }, { ...env, PAYSTACK_CURRENCIES: '', STRIPE_CURRENCIES: '' }, { ...env, PAYMENT_RETURN_ORIGIN: 'https://evil.example' }]) {
      expect(paymentOptions(disabled as Env).every((option) => !option.available)).toBe(true);
    }
  });
  it('supports GH MoMo/Telecel without claiming local wallets for Togo, Burkina Faso or Nigeria', () => {
    expect(paymentOptions(env, 'GH').find((option) => option.method === 'mobile_money')).toMatchObject({ available: true, detail: expect.stringContaining('Telecel') });
    for (const country of ['TG', 'BF', 'NG', 'CI']) expect(paymentOptions(env, country).find((option) => option.method === 'mobile_money')?.available).toBe(false);
    expect(paymentOptions(env, 'TG').find((option) => option.id === 'paystack:card')?.available).toBe(true);
  });
  it('requires matching merchant and currency for CIV mobile money and Nigerian bank transfer', () => {
    expect(paymentOptions({ ...env, PAYSTACK_MERCHANT_COUNTRY: 'CI', PAYSTACK_CURRENCIES: 'XOF' }, 'CI', 'XOF').find((option) => option.method === 'mobile_money')?.available).toBe(true);
    expect(paymentOptions({ ...env, PAYSTACK_MERCHANT_COUNTRY: 'NG', PAYSTACK_CURRENCIES: 'NGN' }, 'NG', 'NGN').find((option) => option.method === 'bank_payment')?.available).toBe(true);
    expect(() => assertPaymentOption(env, 'paystack', 'mobile_money', 'TG', 'GHS')).toThrow();
  });
  it('rejects unsafe origins and non-provider checkout destinations', () => {
    expect(returnOrigin({ ...env, PAYMENT_RETURN_ORIGIN: 'http://localhost:5173/path' })).toBeNull();
    for (const url of ['javascript:alert(1)', 'https://checkout.stripe.com.evil.example/a', 'https://user@checkout.stripe.com/a', 'http://checkout.stripe.com/a']) expect(() => safeCheckoutUrl(url, 'stripe')).toThrow();
  });
  it('uses exact minor units and rejects fractional or nonfinite totals', () => {
    expect(minorAmount(75, 'GHS')).toBe(7500);
    expect(minorAmount(75, 'XOF')).toBe(75);
    for (const amount of [0, -1, NaN, Infinity, 0.001]) expect(() => minorAmount(amount, 'GHS')).toThrow();
    expect(() => minorAmount(1.5, 'XOF')).toThrow();
  });
});

describe('hosted gateway protocols', () => {
  it('initializes Paystack with server amounts and the selected channel', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: true, data: { reference: attempt.reference, authorization_url: 'https://checkout.paystack.com/abc' } }));
    vi.stubGlobal('fetch', fetcher);
    expect(await initializePayment(env, attempt)).toMatchObject({ checkout_url: 'https://checkout.paystack.com/abc' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ amount: 7500, channels: ['mobile_money'], currency: 'GHS', reference: attempt.reference, metadata: { order_id: 'order-1' } });
  });
  it('uses stable Stripe idempotency and hosted wallet-capable card checkout', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/abc' }));
    vi.stubGlobal('fetch', fetcher);
    await initializePayment(env, { ...attempt, provider: 'stripe', method: 'digital_wallet' });
    const request = fetcher.mock.calls[0][1];
    expect(request.headers['Idempotency-Key']).toBe(attempt.reference);
    expect(request.body.get('line_items[0][price_data][unit_amount]')).toBe('7500');
    expect(request.body.get('payment_method_types[0]')).toBe('card');
    expect(request.body.get('client_reference_id')).toBe(attempt.reference);
  });
  it('converts Paystack XOF wire amounts to and from its required x100 format', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ status: true, data: { reference: attempt.reference, authorization_url: 'https://checkout.paystack.com/abc' } }))
      .mockResolvedValueOnce(Response.json({ status: true, data: { reference: attempt.reference, metadata: { order_id: attempt.order_id }, amount: 7500, currency: 'XOF', status: 'success', id: 1 } }));
    vi.stubGlobal('fetch', fetcher);
    const xof = { ...attempt, amount_minor: 75, currency: 'XOF' };
    await initializePayment(env, xof);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).amount).toBe(7500);
    expect(matchesPayment(xof, await verifyPayment(env, xof))).toBe(true);
  });
  it('does not treat Stripe checkout completion with unpaid status as paid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'complete', payment_status: 'unpaid', client_reference_id: attempt.reference, metadata: { order_id: 'order-1' }, amount_total: 7500, currency: 'ghs', id: 'cs_1' })));
    const verified = await verifyPayment(env, { ...attempt, provider: 'stripe', session_id: 'cs_1' });
    expect(verified.paid).toBe(false);
    expect(matchesPayment(attempt, verified)).toBe(true);
    for (const change of [{ amount_minor: 7400 }, { currency: 'USD' }, { order_id: 'other' }, { reference: 'other' }]) expect(matchesPayment(attempt, { ...verified, ...change })).toBe(false);
  });
  it('reports uncertain provider errors without exposing credentials or response payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'sensitive provider output' }, { status: 500 })));
    await expect(initializePayment(env, attempt)).rejects.toThrow('Your order remains saved');
  });
});

describe('webhook signatures', () => {
  it('checks raw Paystack payloads using HMAC SHA512', async () => {
    const body = '{"event":"charge.success"}';
    const signature = await hmac(body, env.PAYSTACK_SECRET_KEY!, 'SHA-512');
    expect(await validWebhook(env, 'paystack', body, signature)).toBe(true);
    expect(await validWebhook(env, 'paystack', `${body} `, signature)).toBe(false);
  });
  it('accepts Stripe rotation signatures and rejects expired or forged events', async () => {
    const body = '{"type":"checkout.session.completed"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await hmac(`${timestamp}.${body}`, env.STRIPE_WEBHOOK_SECRET!, 'SHA-256');
    expect(await validWebhook(env, 'stripe', body, `t=${timestamp},v1=old,v1=${signature}`)).toBe(true);
    expect(await validWebhook(env, 'stripe', body, `t=${timestamp - 1000},v1=${signature}`)).toBe(false);
    expect(await validWebhook(env, 'stripe', `${body} `, `t=${timestamp},v1=${signature}`)).toBe(false);
  });
});
