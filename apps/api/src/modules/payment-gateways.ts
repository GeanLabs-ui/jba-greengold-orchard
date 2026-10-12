import { timingSafeEqual } from '../security.js';

export type Provider = 'paystack' | 'stripe';
export type PaymentMethod = 'card' | 'mobile_money' | 'bank_payment' | 'digital_wallet';
export type Attempt = {
  order_id: string; provider: Provider; method: PaymentMethod; country: string;
  reference: string; amount_minor: number; currency: string; email: string;
  status: 'initializing' | 'pending' | 'paid' | 'failed';
  session_id?: string; checkout_url?: string; created_at: string;
};
export class PaymentError extends Error {
  constructor(message: string, public status: 409 | 422 | 503 = 409) { super(message); }
}
const list = (value = '') => value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);

export function returnOrigin(env: Env) {
  try {
    const url = new URL(env.PAYMENT_RETURN_ORIGIN || '');
    if (url.origin !== env.PAYMENT_RETURN_ORIGIN || !listOrigins(env).includes(url.origin)
      || (url.protocol !== 'https:' && !(env.APP_ENV === 'local' && ['localhost', '127.0.0.1'].includes(url.hostname)))) return null;
    return url.origin;
  } catch { return null; }
}
const listOrigins = (env: Env) => (env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim());

export function paymentOptions(env: Env, country = 'GH', currency = 'GHS') {
  const enabled = env.PAYMENTS_ENABLED === 'true' && Boolean(returnOrigin(env));
  const paystack = enabled && Boolean(env.PAYSTACK_SECRET_KEY) && list(env.PAYSTACK_CURRENCIES).includes(currency);
  const stripe = enabled && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) && list(env.STRIPE_CURRENCIES).includes(currency);
  const merchant = env.PAYSTACK_MERCHANT_COUNTRY?.toUpperCase();
  const mobileCurrency: Record<string, string> = { GH: 'GHS', KE: 'KES', CI: 'XOF' };
  const mobile = paystack && country === merchant && mobileCurrency[country] === currency;
  const bank = paystack && country === merchant && ((country === 'GH' && currency === 'GHS') || (country === 'NG' && currency === 'NGN'));
  return [
    { id: 'paystack:card', provider: 'paystack', method: 'card', label: 'Card · Paystack', detail: 'Visa and Mastercard', available: paystack },
    { id: 'paystack:mobile_money', provider: 'paystack', method: 'mobile_money', label: 'Mobile money', detail: country === 'GH' ? 'MTN MoMo, Telecel Cash, ATMoney' : country === 'CI' ? 'MTN, Orange Money, Wave' : country === 'KE' ? 'M-PESA, Airtel Money' : 'Local wallets depend on country coverage', available: mobile },
    { id: 'paystack:bank_payment', provider: 'paystack', method: 'bank_payment', label: 'Pay by bank', detail: 'Bank transfer through Paystack', available: bank },
    { id: 'stripe:card', provider: 'stripe', method: 'card', label: 'Card · Stripe', detail: 'Visa and Mastercard', available: stripe },
    { id: 'stripe:digital_wallet', provider: 'stripe', method: 'digital_wallet', label: 'Apple Pay / Google Pay', detail: 'Available on supported devices; card fallback', available: stripe },
  ].map((option) => ({ ...option, reason: option.available ? '' : enabled && (paystack || stripe) ? 'Unavailable for this country or currency' : 'Coming soon' }));
}

export function assertPaymentOption(env: Env, provider: Provider, method: PaymentMethod, country: string, currency: string) {
  if (!paymentOptions(env, country, currency).some((option) => option.id === `${provider}:${method}` && option.available)) {
    throw new PaymentError('This payment option is not available yet. Please choose another method.', 503);
  }
}

// Storefront amounts are GHS, with no implicit FX conversion. XOF and other
// zero-decimal currencies must be priced separately before they reach this layer.
export function minorAmount(amount: number, currency: string) {
  const factor = ['XOF', 'XAF', 'JPY', 'KRW', 'RWF', 'UGX', 'VND', 'CLP', 'VUV', 'XPF', 'BIF', 'DJF', 'GNF', 'KMF', 'MGA', 'PYG'].includes(currency) ? 1 : 100;
  const minor = Math.round(amount * factor);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(minor) || minor <= 0 || Math.abs(amount * factor - minor) > 0.00001) throw new PaymentError('Invalid order amount.', 422);
  return minor;
}

async function gatewayFetch(url: string, init: RequestInit) {
  let response: Response;
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) }); }
  catch { throw new PaymentError('The payment provider did not respond. Your order is saved; check its payment status before trying again.', 503); }
  const body = await response.json().catch(() => null) as any;
  if (!response.ok || !body || body.status === false) throw new PaymentError('The payment provider could not complete this request. Your order remains saved.', 503);
  return body;
}

export function safeCheckoutUrl(value: unknown, provider: Provider): string {
  if (typeof value !== 'string') throw new PaymentError('Invalid payment checkout response.', 503);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== (provider === 'stripe' ? 'checkout.stripe.com' : 'checkout.paystack.com')) throw new PaymentError('Invalid payment checkout destination.', 503);
  return url.href;
}

export async function initializePayment(env: Env, attempt: Attempt) {
  const origin = returnOrigin(env);
  if (!origin) throw new PaymentError('Payment return URL is not configured.', 503);
  const callback = `${origin}/portal/payments/return?attempt=${encodeURIComponent(attempt.reference)}`;
  if (attempt.provider === 'paystack') {
    const channels = attempt.method === 'mobile_money' ? ['mobile_money'] : attempt.method === 'bank_payment' ? ['bank_transfer'] : ['card'];
    const result = await gatewayFetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      // Paystack requires XOF x100 even though ISO/Stripe XOF has no subunits.
      body: JSON.stringify({ amount: attempt.amount_minor * (attempt.currency === 'XOF' ? 100 : 1), currency: attempt.currency, email: attempt.email, reference: attempt.reference, callback_url: callback, channels, metadata: { order_id: attempt.order_id } }),
    });
    if (result.data?.reference !== attempt.reference) throw new PaymentError('Payment reference mismatch.', 503);
    return { session_id: attempt.reference, checkout_url: safeCheckoutUrl(result.data.authorization_url, 'paystack') };
  }
  const body = new URLSearchParams({
    mode: 'payment', customer_email: attempt.email, client_reference_id: attempt.reference,
    success_url: callback, cancel_url: `${callback}&cancelled=1`,
    'payment_method_types[0]': 'card', 'metadata[order_id]': attempt.order_id,
    'line_items[0][price_data][currency]': attempt.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(attempt.amount_minor),
    'line_items[0][price_data][product_data][name]': 'JBA GreenGold Orchard order',
    'line_items[0][quantity]': '1',
  });
  const result = await gatewayFetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': attempt.reference }, body,
  });
  if (typeof result.id !== 'string') throw new PaymentError('Invalid payment session.', 503);
  return { session_id: result.id, checkout_url: safeCheckoutUrl(result.url, 'stripe') };
}

export type VerifiedPayment = { reference: string; order_id: string; amount_minor: number; currency: string; paid: boolean; terminal: boolean; transaction_id: string };
export async function verifyPayment(env: Env, attempt: Attempt): Promise<VerifiedPayment> {
  if (attempt.provider === 'paystack') {
    const { data } = await gatewayFetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(attempt.reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
    return { reference: data.reference, order_id: data.metadata?.order_id, amount_minor: data.currency === 'XOF' ? data.amount / 100 : data.amount, currency: data.currency, paid: data.status === 'success', terminal: ['failed', 'abandoned', 'reversed'].includes(data.status), transaction_id: String(data.id) };
  }
  if (!attempt.session_id) throw new PaymentError('Payment initialization is still being reconciled. Please try again shortly.', 503);
  const data = await gatewayFetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(attempt.session_id)}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  return { reference: data.client_reference_id, order_id: data.metadata?.order_id, amount_minor: data.amount_total, currency: String(data.currency).toUpperCase(), paid: data.payment_status === 'paid', terminal: data.status === 'expired', transaction_id: data.payment_intent || data.id };
}

export function matchesPayment(attempt: Attempt, verified: VerifiedPayment) {
  return verified.reference === attempt.reference && verified.order_id === attempt.order_id
    && verified.amount_minor === attempt.amount_minor && verified.currency === attempt.currency;
}

export async function hmac(body: string, secret: string, algorithm: 'SHA-256' | 'SHA-512') {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function validWebhook(env: Env, provider: Provider, body: string, signature: string) {
  if (signature.length > 2048) return false;
  if (provider === 'paystack') return Boolean(env.PAYSTACK_SECRET_KEY) && timingSafeEqual(await hmac(body, env.PAYSTACK_SECRET_KEY!, 'SHA-512'), signature);
  if (!env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = signature.split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1] || '';
  if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = await hmac(`${timestamp}.${body}`, env.STRIPE_WEBHOOK_SECRET, 'SHA-256');
  return parts.some(([key, value]) => key === 'v1' && timingSafeEqual(expected, value));
}
