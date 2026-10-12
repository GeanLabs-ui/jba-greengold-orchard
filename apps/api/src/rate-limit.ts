import type { Database } from './db.js';
import { sha256 } from './security.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
}

export async function checkRateLimit(
  sql: Database,
  action: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + windowSeconds * 1000);
  const keyHash = await sha256(identity);
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limit_windows (key_hash, action, window_start, count, expires_at)
    VALUES (${keyHash}, ${action}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT (key_hash, action, window_start)
    DO UPDATE SET count = rate_limit_windows.count + 1
    RETURNING count
  `;
  const count = rows[0]?.count ?? limit + 1;
  return {
    allowed: count <= limit,
    retryAfter: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
    remaining: Math.max(0, limit - count),
  };
}

export function requestIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'local';
}
