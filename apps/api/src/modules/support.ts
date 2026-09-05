import { Hono } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { checkRateLimit, requestIp } from '../rate-limit.js';
import { timingSafeEqual } from '../security.js';
import { getSupportReply, type PublicNewsItem } from './support-bot.js';

type WhatsAppEnv = {
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_GRAPH_API_VERSION?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
};

type WhatsAppMessage = {
  from?: unknown;
  id?: unknown;
  text?: { body?: unknown };
  type?: unknown;
};

const chatSchema = z.object({ message: z.string().trim().min(1).max(1_000) });
const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function config(env: Env): WhatsAppEnv {
  return env as Env & WhatsAppEnv;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hasValidMetaSignature(rawBody: ArrayBuffer, signature: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, rawBody);
  return timingSafeEqual(signature, `sha256=${toHex(digest)}`);
}

async function sendWhatsAppText(env: Env, to: string, body: string): Promise<void> {
  const settings = config(env);
  if (!settings.WHATSAPP_ACCESS_TOKEN || !settings.WHATSAPP_PHONE_NUMBER_ID || !settings.WHATSAPP_GRAPH_API_VERSION) {
    console.warn(JSON.stringify({ event: 'whatsapp_not_configured' }));
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${settings.WHATSAPP_GRAPH_API_VERSION}/${settings.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } }),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'whatsapp_send_failed', status: response.status }));
  }
}

function messagesFromWebhook(payload: unknown): WhatsAppMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const changes = entry && typeof entry === 'object' ? (entry as { changes?: unknown }).changes : undefined;
    if (!Array.isArray(changes)) return [];
    return changes.flatMap((change) => {
      const value = change && typeof change === 'object' ? (change as { value?: unknown }).value : undefined;
      const messages = value && typeof value === 'object' ? (value as { messages?: unknown }).messages : undefined;
      return Array.isArray(messages) ? messages as WhatsAppMessage[] : [];
    });
  });
}

async function latestPublicNews(env: Env): Promise<PublicNewsItem[]> {
  const sql = createDatabase(env);
  try {
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM entity_records
      WHERE entity_name = 'NewsPost'
        AND data->>'status' = 'published'
      ORDER BY COALESCE(data->>'published_at', created_at::text) DESC
      LIMIT 3
    `;
    return rows.flatMap(({ data }) => {
      if (!data || typeof data !== 'object') return [];
      const item = data as Record<string, unknown>;
      return typeof item.title === 'string'
        ? [{ title: item.title.slice(0, 200), excerpt: typeof item.excerpt === 'string' ? item.excerpt.slice(0, 280) : null, slug: typeof item.slug === 'string' ? item.slug.slice(0, 200) : null }]
        : [];
    });
  } finally {
    await closeDatabase(sql);
  }
}

async function replyForPublicQuestion(env: Env, message: string) {
  const needsNews = /\b(news|update|updates|announcement|announcements|harvest update)\b/i.test(message);
  return getSupportReply(message, { news: needsNews ? await latestPublicNews(env) : [] });
}

router.post('/chat', async (c) => {
  const input = chatSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a message of up to 1,000 characters.' }, requestId: c.get('requestId') }, 422);

  const sql = createDatabase(c.env);
  try {
    const rate = await checkRateLimit(sql, 'support-chat', requestIp(c.req.raw), 30, 900);
    if (!rate.allowed) return c.json({ error: { code: 'RATE_LIMITED', message: 'Please wait a few minutes before sending another message.' }, requestId: c.get('requestId') }, 429, { 'Retry-After': String(rate.retryAfter) });
  } finally {
    await closeDatabase(sql);
  }

  return c.json({ data: await replyForPublicQuestion(c.env, input.data.message), requestId: c.get('requestId') });
});

// Meta calls this endpoint while the webhook is being connected in the WhatsApp
// Business dashboard. The exact challenge must be returned as plain text.
router.get('/whatsapp', (c) => {
  const settings = config(c.env);
  const mode = c.req.query('hub.mode');
  const verifyToken = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  if (mode !== 'subscribe' || !challenge || !timingSafeEqual(verifyToken, settings.WHATSAPP_VERIFY_TOKEN)) return c.text('Forbidden', 403);
  return c.text(challenge, 200);
});

router.post('/whatsapp', async (c) => {
  const rawBody = await c.req.raw.arrayBuffer();
  const settings = config(c.env);
  if (!await hasValidMetaSignature(rawBody, c.req.header('X-Hub-Signature-256'), settings.WHATSAPP_APP_SECRET)) return c.text('Forbidden', 403);

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return c.text('Bad Request', 400);
  }

  const incomingMessages = messagesFromWebhook(payload);
  const responses = await Promise.all(incomingMessages.flatMap((message) => {
    const from = typeof message.from === 'string' ? message.from : '';
    const body = typeof message.text?.body === 'string' ? message.text.body : '';
    return message.type === 'text' && from && body ? [replyForPublicQuestion(c.env, body).then((reply) => sendWhatsAppText(c.env, from, reply.reply))] : [];
  }));
  await Promise.all(responses);
  return c.json({ received: true });
});

export default router;
