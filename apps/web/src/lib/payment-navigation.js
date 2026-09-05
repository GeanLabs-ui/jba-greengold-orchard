export function paymentCheckoutUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['checkout.paystack.com', 'checkout.stripe.com'].includes(url.hostname)) throw new Error('The payment checkout address is invalid.');
  return url.href;
}

// Persist the idempotency key across a reload after a lost order response.
// Only a digest is stored, never contact details or payment credentials.
export async function checkoutKey(payload, userId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `jba-checkout:${userId || 'customer'}`;
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (previous?.fingerprint === fingerprint && /^[a-f0-9-]{36}$/.test(previous.key)) return previous.key;
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify({ key, fingerprint }));
    return key;
  } catch { return crypto.randomUUID(); }
}

export function forgetCheckoutKey(userId) {
  try { sessionStorage.removeItem(`jba-checkout:${userId || 'customer'}`); } catch { /* Storage may be blocked. */ }
}
