import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { LOCAL_TEST_ACCOUNTS, localTestLoginEnabled } from '../apps/api/src/modules/local-development.ts';

const config = JSON.parse(await readFile(new URL('../apps/api/wrangler.jsonc', import.meta.url), 'utf8'));
const environment = { ...config.vars, ...process.env };
if (environment.APP_ENV === 'local' && environment.LOCAL_TEST_LOGIN_ENABLED !== 'true') {
  console.log('Local test login is disabled; skipping test-account seeding.');
  process.exit(0);
}
if (!localTestLoginEnabled(environment)) throw new Error('Local test seeding requires APP_ENV=local, LOCAL_TEST_LOGIN_ENABLED=true and the protected local database.');
const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
try {
  await sql.begin(async tx => {
    for (const account of Object.values(LOCAL_TEST_ACCOUNTS)) {
      await tx`INSERT INTO users (id, email, full_name, role, status, email_verified_at)
        VALUES (${account.id}, ${account.email}, ${account.fullName}, ${account.role}, 'active', now())
        ON CONFLICT DO NOTHING`;
      const [existing] = await tx`SELECT email, role FROM users WHERE id = ${account.id}`;
      if (!existing || existing.email !== account.email || existing.role !== account.role) throw new Error('Local fixture conflicts with an existing account. No accounts were modified.');
    }
  });
  console.log('Local test admin and customer are seeded. Existing accounts, roles, disabled status and business records were not modified.');
} finally { await sql.end(); }
