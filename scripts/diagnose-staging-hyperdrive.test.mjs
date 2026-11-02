import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose-staging-hyperdrive.mjs';
import { isolatedStaging } from './staging-database-identity.mjs';

const env = { CLOUDFLARE_ACCOUNT_ID: 'b704861ca32f3579611a66b3a0f7f874', CLOUDFLARE_API_TOKEN: 'synthetic-secret' };
describe('read-only staging Hyperdrive diagnostic', () => {
  it('uses only GET and reports expected origin without exposing response secrets', async () => {
    const report = await diagnose(env, async (url, options) => {
      expect(options.method).toBe('GET');
      expect(new URL(url).hostname).toBe('api.cloudflare.com');
      return { ok: true, status: 200, json: async () => ({ success: true, result: {
        id: 'a'.repeat(32), status: 'active', secret: env.CLOUDFLARE_API_TOKEN,
        origin: { host: isolatedStaging.host, database: isolatedStaging.database,
          user: isolatedStaging.runtimeRole, port: 5432, scheme: 'postgres', password: 'response-secret' },
      } }) };
    });
    expect(report.passed).toBe(true);
    expect(JSON.stringify(report)).not.toContain('synthetic-secret');
    expect(JSON.stringify(report)).not.toContain('response-secret');
  });
  it('keeps failure diagnostics useful without echoing arbitrary server messages', async () => {
    const report = await diagnose(env, async () => ({ ok: false, status: 403,
      json: async () => ({ success: false, errors: [{ code: 9109, message: env.CLOUDFLARE_API_TOKEN }] }) }));
    expect(report.passed).toBe(false);
    expect(report.hyperdrive.errorCodes).toEqual([9109]);
    expect(JSON.stringify(report)).not.toContain(env.CLOUDFLARE_API_TOKEN);
  });
  it('refuses an unexpected account without making requests', async () => {
    let called = false;
    const report = await diagnose({ ...env, CLOUDFLARE_ACCOUNT_ID: 'other' }, async () => { called = true; });
    expect(report.passed).toBe(false);
    expect(called).toBe(false);
  });
  it('fails if a readable Hyperdrive points to a different database', async () => {
    const report = await diagnose(env, async () => ({ ok: true, status: 200,
      json: async () => ({ success: true, result: { origin: { host: 'wrong' } } }) }));
    expect(report.passed).toBe(false);
  });
});
