import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { fingerprint, seal, unseal } from './secure-payload.mjs';
import { activityTotal, prepareInserts, verifyAfter } from './book5-plan.mjs';

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
    if (plan?.mode === 'apply') {
      await tx`LOCK TABLE entity_records IN SHARE ROW EXCLUSIVE MODE`;
      await tx`LOCK TABLE farms, farm_blocks IN SHARE MODE`;
    }
    const before = await snapshot(tx);
    await writeFile(new URL('before.enc', output), seal(before, key));
    if (!plan || plan.mode === 'snapshot') return { mode: 'snapshot', inserted: 0 };
    const inserts = prepareInserts(before, plan);
    for (const row of inserts) {
      await tx`INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by)
        VALUES (${row.id}, 'DailyActivity', ${row.organization_id}, null, ${tx.json(row.data)}, null, null)`;
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values)
        VALUES (${randomUUID()}, null, 'workbook_import', 'DailyActivity', ${row.id}, ${tx.json({ source: 'Book5.xlsx', source_row: row.data.source_row, workflow_run: process.env.GITHUB_RUN_ID || null })})`;
    }
    const inside = await snapshot(tx);
    verifyAfter(before, inside, inserts);
    // A second planning pass must propose no additional rows before committing.
    if (prepareInserts(inside, plan).length !== 0) throw new Error('Idempotency verification failed');
    return { mode: 'apply', inserted: inserts.length, added_cost: activityTotal(inserts), before_count: before.records.filter(r => r.entity_name === 'DailyActivity').length, before_cost: activityTotal(before.records), after_count: inside.records.filter(r => r.entity_name === 'DailyActivity').length, after_cost: activityTotal(inside.records), inserted_ids: inserts.map(row => row.id), verified_fingerprint: fingerprint(inside) };
  });
  const after = await snapshot(sql);
  if (result.mode === 'apply' && fingerprint(after) !== result.verified_fingerprint) throw new Error('Post-commit snapshot differs; inspect database before retrying');
  await writeFile(new URL('after.enc', output), seal(after, key));
  await writeFile(new URL('result.enc', output), seal({ ...result, fingerprint: fingerprint(after) }, key));
  console.log(`Staging reconciliation completed: ${result.mode}; ${result.inserted} records inserted. Encrypted evidence saved.`);
} catch (error) {
  await writeFile(new URL('error.enc', output), seal({ message: error.message, code: error.code || null }, key));
  // Database errors can contain private row values or connection information.
  console.error('Staging reconciliation failed. No successful import is claimed; inspect encrypted evidence.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
