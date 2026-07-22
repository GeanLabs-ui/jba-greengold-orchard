import { z } from 'zod';

const verificationSchema = z.object({ success: z.boolean() });

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (env.APP_ENV === 'local') return true;
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;

  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  body.set('remoteip', ip);
  body.set('idempotency_key', crypto.randomUUID());
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!response.ok) return false;
  const parsed = verificationSchema.safeParse(await response.json());
  return parsed.success && parsed.data.success;
}
