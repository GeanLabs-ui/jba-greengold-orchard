import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkoutKey, forgetCheckoutKey, paymentCheckoutUrl } from './payment-navigation';
afterEach(() => vi.unstubAllGlobals());
describe('payment navigation', () => {
  it('allows only HTTPS hosted gateway destinations', () => {
    expect(paymentCheckoutUrl('https://checkout.paystack.com/abc')).toBe('https://checkout.paystack.com/abc');
    expect(paymentCheckoutUrl('https://checkout.stripe.com/c/pay/abc')).toBe('https://checkout.stripe.com/c/pay/abc');
    for (const value of ['https://evil.example', 'https://checkout.stripe.com.evil.example', 'javascript:alert(1)', 'https://user@checkout.stripe.com']) expect(() => paymentCheckoutUrl(value)).toThrow();
  });
  it('reuses an order key after lost responses and isolates customers and changed baskets', async () => {
    const storage = new Map();
    vi.stubGlobal('sessionStorage', { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) });
    const first = await checkoutKey({ quantity: 1 }, 'a');
    expect(await checkoutKey({ quantity: 1 }, 'a')).toBe(first);
    expect(await checkoutKey({ quantity: 1 }, 'b')).not.toBe(first);
    expect(await checkoutKey({ quantity: 2 }, 'a')).not.toBe(first);
    forgetCheckoutKey('a');
    expect(await checkoutKey({ quantity: 1 }, 'a')).not.toBe(first);
  });
});
