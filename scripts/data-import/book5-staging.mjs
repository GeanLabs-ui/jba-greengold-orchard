import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { fingerprint, seal, unseal } from './secure-payload.mjs';

// Deliberately separate from schema migrations: this operation must never run in production.
const origin = 'https://staging.jba-greengold-orchard.pages.dev';
const key = process.env.BOOK5_IMPORT_KEY;
if (process.env.APP_URL !== origin || process.env.GITHUB_REF !== 'refs/heads/staging') {
  throw new Error('This import is restricted to the staging branch and staging origin');
}
if (!process.env.DATABASE_URL || !key) throw new Error('Staging database and encryption secrets are required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const output = new URL('../../test-results/book5/', import.meta.url);
await mkdir(output, { recursive: true });
async function snapshot(tx) {
  const records = await tx`SELECT * FROM entity_records WHERE entity_name IN ('DailyActivity', 'FarmExpense', 'FarmFinanceRecord') ORDER BY id`;
  const blocks = await tx`SELECT id, farm_id, organization_id, block_code, name, status FROM farm_blocks ORDER BY id`;
  const farms = await tx`SELECT id, organization_id, farm_code, name, status FROM farms ORDER BY id`;
  return { records, blocks, farms };
}
try {
  let plan = null;
  try { plan = unseal(await readFile(new URL('./book5-plan.enc', import.meta.url), 'utf8'), key); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Unable to decrypt the import plan'); }
  const result = await sql.begin(async tx => {
    await tx`SET LOCAL lock_timeout = '15s'`;
    await tx`SET LOCAL statement_timeout = '60s'`;
    if (plan?.mode === 'apply') await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
    const before = await snapshot(tx);
    await writeFile(new URL('before.enc', output), seal(before, key));
    if (!plan || plan.mode === 'snapshot') return { mode: 'snapshot', inserted: 0 };
    throw new Error('Apply mode is not enabled until the live snapshot has been reconciled');
  });
  const after = await snapshot(sql);
  await writeFile(new URL('after.enc', output), seal(after, key));
  await writeFile(new URL('result.enc', output), seal({ ...result, fingerprint: fingerprint(after) }, key));
  console.log(`Staging reconciliation completed: ${result.mode}; ${result.inserted} records inserted. Encrypted evidence saved.`);
} catch {
  // Database errors can contain private row values or connection information.
  console.error('Staging reconciliation failed. No successful import is claimed; inspect encrypted evidence.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
