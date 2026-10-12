import { closeDatabase, createDatabase } from './db.js';

/**
 * Deletes expired rate_limit_windows rows to prevent unbounded table growth.
 * Called on a scheduled cron trigger (every hour).
 */
export async function purgeExpiredRateLimitWindows(env: Env): Promise<number> {
  const sql = createDatabase(env);
  try {
    const result = await sql<{ count: string }[]>`
      DELETE FROM rate_limit_windows
      WHERE expires_at < now() - interval '1 hour'
      RETURNING 1
    `;
    const deleted = result.length;
    if (deleted > 0) {
      console.log(JSON.stringify({ event: 'rate_limit_purge', deleted }));
    }
    return deleted;
  } finally {
    await closeDatabase(sql);
  }
}

/**
 * Deletes expired email_verification_tokens rows (older than 48 hours).
 * Called on the same scheduled cron trigger.
 */
export async function purgeExpiredVerificationTokens(env: Env): Promise<void> {
  const sql = createDatabase(env);
  try {
    await sql`
      DELETE FROM email_verification_tokens
      WHERE expires_at < now() - interval '1 hour'
    `;
  } finally {
    await closeDatabase(sql);
  }
}
