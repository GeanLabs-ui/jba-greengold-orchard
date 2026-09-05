import { Hono } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase } from '../db.js';
import { requireRole, requireCsrf, type AppVariables } from '../middleware/auth.js';
import { checkRateLimit, requestIp } from '../rate-limit.js';
import { assertPaymentOption, PaymentError } from './payment-gateways.js';

export const COMMERCE_CATALOG = {
  'dried-mango': { name: 'Dried Mango', price: 25, image: '/products/catalog-dried-mango.webp' },
  'mango-juice': { name: 'Mango Juice', price: 20, image: '/products/catalog-mango-juice.webp' },
  'wild-mango-wine': { name: 'Wild Mango Wine', price: 85, image: '/products/catalog-wild-mango-wine.webp' },
  'mango-jam': { name: 'Mango Jam', price: 25, image: '/products/catalog-mango-jam.webp' },
  'mango-pickle': { name: 'Mango Pickle', price: 22, image: '/products/catalog-mango-pickle.webp' },
  'dehydrated-mango': { name: 'Dehydrated Mango', price: 30, image: '/products/catalog-dehydrated-mango.webp' },
  'gift-pack-small': { name: 'Gift Pack (Small)', price: 95, image: '/products/catalog-gift-small.webp' },
  'gift-pack-large': { name: 'Gift Pack (Large)', price: 160, image: '/products/catalog-gift-large.webp' },
  'fresh-mango-export-box': { name: 'Fresh Mango Export Box', price: 120, image: '/products/box-package.webp' },
  'dried-mango-pouch': { name: 'Dried Mango Pouch', price: 25, image: '/products/dried-mango.webp' },
  'dehydrated-mango-jar': { name: 'Dehydrated Mango Jar', price: 32, image: '/products/dried-mango-jar.webp' },
  'mango-pudding-pouch': { name: 'Mango Pudding Pouch', price: 18, image: '/products/mango-pudding.webp' },
} as const;

type ProductId = keyof typeof COMMERCE_CATALOG;

const checkoutSchema = z.object({
  checkout_key: z.string().uuid().optional(),
  items: z.array(z.object({
    product_id: z.enum(Object.keys(COMMERCE_CATALOG) as [ProductId, ...ProductId[]]),
    quantity: z.coerce.number().int().min(1).max(99),
  })).min(1).max(50),
  shipping: z.object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().min(7).max(30),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().min(2).max(100),
  }),
  payment_method: z.enum(['cash_on_delivery', 'mobile_money_on_confirmation', 'bank_transfer', 'paystack:card', 'paystack:mobile_money', 'paystack:bank_payment', 'stripe:card', 'stripe:digital_wallet']),
  payment_country: z.string().regex(/^[A-Z]{2}$/).default('GH'),
  notes: z.string().trim().max(1_000).optional().default(''),
});

const guestTrackingSchema = z.object({
  order_number: z.string().trim().toUpperCase().regex(/^JBA-\d{8}-[A-Z0-9]{6}$/),
});

type StoredOrder = Record<string, any>;

// A guest lookup deliberately returns less than the authenticated order view.
// The public result is status-only because the order reference is the sole
// lookup factor. Customer, product, address, payment, and note data stay private.
export function publicOrderTrackingView(order: StoredOrder, createdAt: Date, updatedAt: Date) {
  return {
    order_number: order.order_number,
    order_date: order.order_date || createdAt.toISOString(),
    updated_date: updatedAt.toISOString(),
    status: order.status,
    status_history: Array.isArray(order.status_history) ? order.status_history.map((entry: StoredOrder) => ({
      status: entry.status,
      label: entry.label,
      timestamp: entry.timestamp,
    })) : [],
    estimated_delivery: order.estimated_delivery || null,
  };
}

export function priceOrder(items: Array<{ product_id: ProductId; quantity: number }>) {
  const lines = items.map((item) => {
    const product = COMMERCE_CATALOG[item.product_id];
    const lineTotal = product.price * item.quantity;
    return {
      product_id: item.product_id,
      product_name: product.name,
      product_image: product.image,
      quantity: item.quantity,
      unit_price: product.price,
      line_total: lineTotal,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  const deliveryFee = subtotal >= 250 ? 0 : 25;
  return { lines, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();

router.post('/orders/track', async (c) => {
  const parsed = guestTrackingSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Enter a valid order ID.' },
      requestId: c.get('requestId'),
    }, 422);
  }

  const sql = createDatabase(c.env);
  try {
    const rate = await checkRateLimit(sql, 'guest-order-tracking', requestIp(c.req.raw), 10, 900);
    if (!rate.allowed) {
      c.header('Retry-After', String(rate.retryAfter));
      return c.json({
        error: { code: 'RATE_LIMITED', message: 'Too many tracking attempts. Please try again later.' },
        requestId: c.get('requestId'),
      }, 429);
    }

    const rows = await sql<{ data: StoredOrder; created_at: Date; updated_at: Date }[]>`
      SELECT data, created_at, updated_at
      FROM entity_records
      WHERE entity_name = 'Order'
        AND upper(data->>'order_number') = ${parsed.data.order_number}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return c.json({
        error: { code: 'ORDER_NOT_FOUND', message: 'We could not find an order with that ID.' },
        requestId: c.get('requestId'),
      }, 404);
    }

    c.header('Cache-Control', 'private, no-store');
    return c.json({ data: publicOrderTrackingView(row.data, row.created_at, row.updated_at), requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.get('/orders', requireRole('customer'), async (c) => {
  const user = c.get('user')!;
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ id: string; data: Record<string, unknown>; created_at: Date; updated_at: Date }[]>`
      SELECT id, data, created_at, updated_at
      FROM entity_records
      WHERE entity_name = 'Order' AND owner_user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 250
    `;
    return c.json({
      data: rows.map((row) => ({
        ...row.data,
        id: row.id,
        created_date: row.created_at.toISOString(),
        updated_date: row.updated_at.toISOString(),
      })),
      requestId: c.get('requestId'),
    });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/orders', requireRole('customer'), requireCsrf(), async (c) => {
  const user = c.get('user')!;
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the basket and delivery details' },
      requestId: c.get('requestId'),
    }, 422);
  }

  const sql = createDatabase(c.env);
  try {
    const rate = await checkRateLimit(sql, 'customer-checkout', user.id, 10, 3600);
    if (!rate.allowed) {
      c.header('Retry-After', String(rate.retryAfter));
      return c.json({
        error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts. Please try again later.' },
        requestId: c.get('requestId'),
      }, 429);
    }

    const pricing = priceOrder(parsed.data.items);
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replaceAll('-', '');
    const orderNumber = `JBA-${datePart}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const orderId = crypto.randomUUID();
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `INV-${datePart}-${orderNumber.slice(-6)}`;
    const orderData = {
      checkout_key: parsed.data.checkout_key || null,
      payment_country: parsed.data.payment_country,
      order_number: orderNumber,
      customer_id: user.id,
      customer_name: parsed.data.shipping.full_name,
      customer_email: user.email,
      contact_email: parsed.data.shipping.email,
      contact_phone: parsed.data.shipping.phone,
      order_date: now.toISOString(),
      source: 'website',
      currency: 'GHS',
      items: pricing.lines,
      item_count: pricing.lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal_amount: pricing.subtotal,
      delivery_fee: pricing.deliveryFee,
      total_amount: pricing.total,
      shipping_address: parsed.data.shipping,
      delivery_notes: parsed.data.notes,
      payment_method: parsed.data.payment_method,
      payment_status: 'pending',
      status: 'confirmed',
      status_history: [{
        status: 'confirmed',
        label: 'Order received',
        timestamp: now.toISOString(),
        note: 'Your order has been received and is waiting for fulfillment.',
      }],
      estimated_delivery: null,
    };
    const invoiceData = {
      invoice_number: invoiceNumber,
      order_id: orderId,
      order_number: orderNumber,
      customer_id: user.id,
      customer_name: parsed.data.shipping.full_name,
      customer_email: parsed.data.shipping.email,
      invoice_date: now.toISOString(),
      due_date: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
      source: 'website',
      currency: 'GHS',
      items: pricing.lines,
      subtotal_amount: pricing.subtotal,
      delivery_fee: pricing.deliveryFee,
      total_amount: pricing.total,
      amount_paid: 0,
      balance_due: pricing.total,
      payment_method: parsed.data.payment_method,
      status: 'unpaid',
    };

    const savedOrder = await sql.begin(async (transaction) => {
      if (parsed.data.checkout_key) {
        await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${user.id}:${parsed.data.checkout_key}`}, 0))`;
        const existing = await transaction<{ id: string; data: typeof orderData }[]>`SELECT id, data FROM entity_records WHERE entity_name = 'Order' AND owner_user_id = ${user.id} AND data->>'checkout_key' = ${parsed.data.checkout_key} LIMIT 1`;
        if (existing[0]) return { ...existing[0].data, id: existing[0].id };
      }
      if (parsed.data.payment_method.includes(':')) {
        const [provider, method] = parsed.data.payment_method.split(':');
        assertPaymentOption(c.env, provider as 'stripe' | 'paystack', method as 'card' | 'mobile_money' | 'bank_payment' | 'digital_wallet', parsed.data.payment_country, 'GHS');
      }
      await transaction`
        INSERT INTO entity_records (
          id, entity_name, organization_id, owner_user_id, data,
          created_by, updated_by, created_at, updated_at
        )
        VALUES (
          ${orderId}, 'Order', ${user.organizationId}, ${user.id}, ${sql.json(orderData)},
          ${user.id}, ${user.id}, ${now}, ${now}
        )
      `;

      await transaction`
        INSERT INTO entity_records (
          id, entity_name, organization_id, owner_user_id, data,
          created_by, updated_by, created_at, updated_at
        )
        VALUES (
          ${invoiceId}, 'Invoice', ${user.organizationId}, ${user.id}, ${sql.json(invoiceData)},
          ${user.id}, ${user.id}, ${now}, ${now}
        )
      `;

      const existingCustomers = await transaction<{ id: string }[]>`
        SELECT id FROM entity_records
        WHERE entity_name = 'Customer'
          AND organization_id IS NOT DISTINCT FROM ${user.organizationId}
          AND lower(data->>'email') = ${parsed.data.shipping.email}
        LIMIT 1
      `;
      if (!existingCustomers[0]) {
        await transaction`
          INSERT INTO entity_records (
            id, entity_name, organization_id, owner_user_id, data,
            created_by, updated_by, created_at, updated_at
          )
          VALUES (
            ${crypto.randomUUID()}, 'Customer', ${user.organizationId}, ${user.id},
            ${sql.json({
              customer_code: `WEB-${user.id.slice(0, 8).toUpperCase()}`,
              company_name: parsed.data.shipping.full_name,
              contact_name: parsed.data.shipping.full_name,
              email: parsed.data.shipping.email,
              phone: parsed.data.shipping.phone,
              address: parsed.data.shipping.address,
              city: parsed.data.shipping.city,
              region: parsed.data.shipping.region,
              source: 'website',
              status: 'active',
            })},
            ${user.id}, ${user.id}, ${now}, ${now}
          )
        `;
      }

      await transaction`
        INSERT INTO entity_records (
          id, entity_name, organization_id, owner_user_id, data,
          created_by, updated_by, created_at, updated_at
        )
        VALUES (
          ${crypto.randomUUID()}, 'Notification', ${user.organizationId}, ${user.id},
          ${sql.json({
            title: 'New website sale',
            message: `${orderNumber} from ${parsed.data.shipping.full_name} is ready for sales and fulfillment.`,
            type: 'order',
            notification_type: 'order',
            channel: 'Admin',
            status: 'new',
            order_id: orderId,
            order_number: orderNumber,
            invoice_number: invoiceNumber,
          })},
          ${user.id}, ${user.id}, ${now}, ${now}
        )
      `;

      await transaction`
        INSERT INTO audit_events (
          id, user_id, action, target_table, record_id, new_values, ip_address
        )
        VALUES (
          ${crypto.randomUUID()}, ${user.id}, 'customer_checkout', 'Order', ${orderId},
          ${sql.json({ order_number: orderNumber, total_amount: pricing.total, item_count: orderData.item_count })},
          ${requestIp(c.req.raw)}
        )
      `;
      return { ...orderData, id: orderId, invoice_number: invoiceNumber, created_date: now.toISOString(), updated_date: now.toISOString() };
    });

    return c.json({
      data: savedOrder,
      requestId: c.get('requestId'),
    }, 201);
  } catch (error) {
    if (error instanceof PaymentError) return c.json({ error: { code: 'PAYMENT_UNAVAILABLE', message: error.message } }, error.status);
    throw error;
  } finally {
    await closeDatabase(sql);
  }
});

export default router;
