import { Hono } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase, type Database } from '../db.js';
import { requireRole, requireCsrf, type AppVariables } from '../middleware/auth.js';
import { checkRateLimit } from '../rate-limit.js';
import { assertPaymentOption, initializePayment, matchesPayment, minorAmount, paymentOptions, PaymentError, safeCheckoutUrl, validWebhook, verifyPayment, type Attempt, type VerifiedPayment } from './payment-gateways.js';

type EntityRow<T> = { id: string; owner_user_id: string; organization_id: string | null; data: T };
const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const selection = z.object({ provider: z.enum(['paystack', 'stripe']), method: z.enum(['card', 'mobile_money', 'bank_payment', 'digital_wallet']), country: z.string().regex(/^[A-Z]{2}$/) });
const referenceSchema = z.string().regex(/^jba-[a-f0-9-]{36}$/);

async function readAttempt(sql: Database, reference: string) {
  const rows = await sql<EntityRow<Attempt>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'PaymentAttempt' AND id = ${reference}`;
  return rows[0];
}

// Order lock serializes settlement with new sessions. PaymentAttempt is internal:
// it is deliberately absent from the generic entity API's allowlist.
export async function settlePayment(sql: Database, row: EntityRow<Attempt>, verified: VerifiedPayment) {
  if (!matchesPayment(row.data, verified)) throw new PaymentError('Payment verification did not match the order.', 422);
  return sql.begin(async (tx) => {
    const orders = await tx<EntityRow<Record<string, any>>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'Order' AND id = ${row.data.order_id} FOR UPDATE`;
    const order = orders[0];
    if (!order || order.owner_user_id !== row.owner_user_id) throw new PaymentError('Payment order is unavailable.', 422);
    const attempts = await tx<EntityRow<Attempt>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'PaymentAttempt' AND id = ${row.id} FOR UPDATE`;
    if (attempts[0]?.data.status === 'paid') return 'paid';
    if (!verified.paid) {
      if (verified.terminal) await tx`UPDATE entity_records SET data = data || ${sql.json({ status: 'failed' })}, updated_at = now() WHERE id = ${row.id} AND entity_name = 'PaymentAttempt'`;
      return verified.terminal ? 'failed' : 'pending';
    }
    if (minorAmount(Number(order.data.total_amount), order.data.currency) !== verified.amount_minor || order.data.currency !== verified.currency) throw new PaymentError('Order amount changed; payment needs review.', 422);
    // A late success on an old attempt must never silently apply a second credit.
    if (order.data.payment_status === 'paid') throw new PaymentError('A second payment needs staff reconciliation.', 422);
    const invoices = await tx<EntityRow<Record<string, any>>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'Invoice' AND data->>'order_id' = ${order.id} AND owner_user_id = ${row.owner_user_id} FOR UPDATE`;
    if (invoices.length !== 1 || Number(invoices[0].data.amount_paid || 0) !== 0 || minorAmount(Number(invoices[0].data.total_amount), invoices[0].data.currency) !== verified.amount_minor || invoices[0].data.currency !== verified.currency) throw new PaymentError('Invoice needs staff reconciliation.', 422);
    const invoice = invoices[0];
    const now = new Date().toISOString();
    await tx`UPDATE entity_records SET data = data || ${sql.json({ status: 'paid', transaction_id: verified.transaction_id, paid_at: now })}, updated_at = now() WHERE id = ${row.id} AND entity_name = 'PaymentAttempt'`;
    await tx`UPDATE entity_records SET data = data || ${sql.json({ payment_status: 'paid', paid_at: now, payment_reference: row.id, payment_provider: row.data.provider })}, updated_at = now() WHERE id = ${order.id} AND entity_name = 'Order'`;
    await tx`UPDATE entity_records SET data = data || ${sql.json({ status: 'paid', amount_paid: Number(order.data.total_amount), balance_due: 0, paid_at: now })}, updated_at = now() WHERE id = ${invoice.id} AND entity_name = 'Invoice'`;
    await tx`INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by)
      VALUES (${`receipt-${row.id}`}, 'Payment', ${row.organization_id}, ${row.owner_user_id}, ${sql.json({
        payment_reference: row.id, payment_number: row.id, invoice_id: invoice.id, invoice_number: invoice.data.invoice_number,
        order_id: order.id, order_number: order.data.order_number, customer_id: row.owner_user_id,
        amount: Number(order.data.total_amount), currency: row.data.currency, payment_date: now,
        payment_method: row.data.method, provider: row.data.provider, provider_transaction_id: verified.transaction_id, status: 'completed', source: 'gateway',
      })}, ${row.owner_user_id}, ${row.owner_user_id})`;
    await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values)
      VALUES (${crypto.randomUUID()}, ${row.owner_user_id}, 'gateway_payment_verified', 'Order', ${order.id}, ${sql.json({ reference: row.id, provider: row.data.provider, amount_minor: verified.amount_minor, currency: verified.currency })})`;
    return 'paid';
  });
}

router.onError((error, c) => {
  if (error instanceof PaymentError) return c.json({ error: { code: 'PAYMENT_ERROR', message: error.message }, requestId: c.get('requestId') }, error.status);
  console.error(JSON.stringify({ event: 'payment_operation_failed', requestId: c.get('requestId') }));
  return c.json({ error: { code: 'PAYMENT_ERROR', message: 'Payment could not be confirmed. Your order is saved; please check again.' } }, 503);
});

router.get('/options', (c) => {
  const country = c.req.query('country') || 'GH';
  // Public checkout is denominated in GHS. The client cannot relabel its currency.
  return c.json({ data: { currency: 'GHS', options: paymentOptions(c.env, country, 'GHS') } });
});

router.post('/webhooks/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (provider !== 'stripe' && provider !== 'paystack') return c.json({ error: { message: 'Unknown provider' } }, 404);
  const body = await c.req.text();
  if (body.length > 256000 || !await validWebhook(c.env, provider, body, c.req.header(provider === 'stripe' ? 'stripe-signature' : 'x-paystack-signature') || '')) return c.json({ error: { message: 'Invalid webhook signature' } }, 400);
  let event: any;
  try { event = JSON.parse(body); } catch { return c.json({ error: { message: 'Invalid event' } }, 400); }
  const accepted = provider === 'paystack' ? event.event === 'charge.success' : ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type);
  if (!accepted) return c.json({ received: true });
  const reference = provider === 'paystack' ? event.data?.reference : event.data?.object?.client_reference_id;
  if (!referenceSchema.safeParse(reference).success) return c.json({ received: true });
  const sql = createDatabase(c.env);
  try {
    const row = await readAttempt(sql, reference);
    // A retryable response handles a webhook racing the initial database write.
    if (!row) throw new PaymentError('Payment record is not ready.', 503);
    if (row.data.provider !== provider) return c.json({ error: { message: 'Provider mismatch' } }, 400);
    if (provider === 'stripe' && !row.data.session_id) {
      row.data.session_id = event.data.object.id;
      await sql`UPDATE entity_records SET data = data || ${sql.json({ session_id: row.data.session_id })} WHERE id = ${row.id} AND entity_name = 'PaymentAttempt'`;
    }
    await settlePayment(sql, row, await verifyPayment(c.env, row.data));
    return c.json({ received: true });
  } finally { await closeDatabase(sql); }
});

router.post('/orders/:orderId/session', requireRole('customer'), requireCsrf(), async (c) => {
  const parsed = selection.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { message: 'Choose a valid payment method and country.' } }, 422);
  const user = c.get('user')!;
  const sql = createDatabase(c.env);
  try {
    const rate = await checkRateLimit(sql, 'payment-session', user.id, 20, 3600);
    if (!rate.allowed) return c.json({ error: { message: 'Please wait before starting another payment.' } }, 429);
    const reservation = await sql.begin(async (tx) => {
      const orders = await tx<EntityRow<Record<string, any>>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'Order' AND id = ${c.req.param('orderId')} AND owner_user_id = ${user.id} FOR UPDATE`;
      const order = orders[0];
      if (!order) throw new PaymentError('Order not found.', 422);
      if (order.data.payment_status === 'paid') throw new PaymentError('This order is already paid.');
      if (order.data.status === 'cancelled' || order.data.source !== 'website') throw new PaymentError('This order is not eligible for online payment.');
      assertPaymentOption(c.env, parsed.data.provider, parsed.data.method, parsed.data.country, order.data.currency);
      const invoices = await tx<EntityRow<Record<string, any>>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'Invoice' AND data->>'order_id' = ${order.id} AND owner_user_id = ${user.id} FOR UPDATE`;
      if (invoices.length !== 1 || Number(invoices[0].data.amount_paid || 0) !== 0 || invoices[0].data.status === 'paid' || Number(invoices[0].data.total_amount) !== Number(order.data.total_amount) || invoices[0].data.currency !== order.data.currency) throw new PaymentError('This invoice needs review before online payment.');
      if (order.data.payment_attempt_id) {
        const rows = await tx<EntityRow<Attempt>[]>`SELECT id, owner_user_id, organization_id, data FROM entity_records WHERE entity_name = 'PaymentAttempt' AND id = ${order.data.payment_attempt_id}`;
        const existing = rows[0];
        if (existing && existing.data.status !== 'failed') return { row: existing, fresh: false };
      }
      const reference = `jba-${crypto.randomUUID()}`;
      const attempt: Attempt = { ...parsed.data, order_id: order.id, reference, amount_minor: minorAmount(Number(order.data.total_amount), order.data.currency), currency: order.data.currency, email: user.email, status: 'initializing', created_at: new Date().toISOString() };
      await tx`INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by)
        VALUES (${reference}, 'PaymentAttempt', ${order.organization_id}, ${user.id}, ${sql.json(attempt)}, ${user.id}, ${user.id})`;
      await tx`UPDATE entity_records SET data = data || ${sql.json({ payment_attempt_id: reference, payment_method: `${attempt.provider}:${attempt.method}`, payment_country: attempt.country })}, updated_at = now() WHERE id = ${order.id} AND entity_name = 'Order'`;
      return { row: { id: reference, owner_user_id: user.id, organization_id: order.organization_id, data: attempt }, fresh: true };
    });
    const { row, fresh } = reservation;
    if (!fresh && (row.data.provider !== parsed.data.provider || row.data.method !== parsed.data.method || row.data.country !== parsed.data.country)) throw new PaymentError('An existing checkout is still active. Check its status or resume its original payment method before changing options.');
    if (row.data.checkout_url) {
      const status = await settlePayment(sql, row, await verifyPayment(c.env, row.data));
      return c.json({ data: { reference: row.id, status, ...(status === 'pending' ? { checkout_url: safeCheckoutUrl(row.data.checkout_url, row.data.provider) } : {}) } });
    }
    // Never create a new Paystack reference after an ambiguous timeout. Stripe
    // supports safe replay of this exact payload/key for up to 24 hours.
    if (!fresh && (row.data.provider === 'paystack' || Date.now() - Date.parse(row.data.created_at) > 23 * 3600000)) {
      const status = await settlePayment(sql, row, await verifyPayment(c.env, row.data));
      return c.json({ data: { reference: row.id, status } });
    }
    const session = await initializePayment(c.env, row.data);
    await sql`UPDATE entity_records SET data = data || ${sql.json(session)} || CASE WHEN data->>'status' = 'initializing' THEN ${sql.json({ status: 'pending' })} ELSE '{}'::jsonb END, updated_at = now() WHERE entity_name = 'PaymentAttempt' AND id = ${row.id}`;
    return c.json({ data: { reference: row.id, checkout_url: session.checkout_url } });
  } finally { await closeDatabase(sql); }
});

router.post('/attempts/:reference/verify', requireRole('customer'), requireCsrf(), async (c) => {
  const parsed = referenceSchema.safeParse(c.req.param('reference'));
  if (!parsed.success) return c.json({ error: { message: 'Invalid payment reference.' } }, 422);
  const user = c.get('user')!;
  const sql = createDatabase(c.env);
  try {
    const row = await readAttempt(sql, parsed.data);
    if (!row || row.owner_user_id !== user.id) return c.json({ error: { message: 'Payment not found.' } }, 404);
    const rate = await checkRateLimit(sql, 'payment-verification', user.id, 60, 3600);
    if (!rate.allowed) return c.json({ error: { message: 'Please wait before checking again.' } }, 429);
    const status = row.data.status === 'paid' ? 'paid' : await settlePayment(sql, row, await verifyPayment(c.env, row.data));
    return c.json({ data: { status, order_id: row.data.order_id, reference: row.id } });
  } finally { await closeDatabase(sql); }
});

export default router;
