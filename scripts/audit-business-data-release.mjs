import { mkdir, readFile, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { seal, unseal, fingerprint } from './data-import/secure-payload.mjs';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const key = process.env.BOOK5_IMPORT_KEY;
if (!key || !process.env.DATABASE_URL) throw new Error('Database and encryption configuration required');
const output = new URL('../test-results/business-data-release/', import.meta.url);
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
try {
  await mkdir(output, { recursive: true });
  const snapshot = await sql.begin(async tx => {
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    const records = {};
    for (const { tablename } of tables) {
      // Exclude ephemeral authentication/maintenance state and the migration ledger.
      if (/^_|session|rate_limit|verification_token|password_reset/i.test(tablename)) continue;
      records[tablename] = await tx`SELECT to_jsonb(t) AS row FROM ${tx(tablename)} AS t`;
    }
    return records;
  });
  await writeFile(new URL(`${phase}.enc`, output), seal(snapshot, key));
  if (phase === 'after') {
    const before = unseal(await readFile(new URL('before.enc', output), 'utf8'), key);
    for (const [table, rows] of Object.entries(before)) {
      const remaining = new Map();
      for (const row of snapshot[table] || []) {
        const hash = fingerprint(row);
        remaining.set(hash, (remaining.get(hash) || 0) + 1);
      }
      for (const row of rows) {
        const hash = fingerprint(row), count = remaining.get(hash) || 0;
        if (!count) throw new Error(`Existing data changed or disappeared in ${table}; inspect encrypted snapshots before proceeding`);
        remaining.set(hash, count - 1);
      }
    }
  }
  console.log(JSON.stringify({ phase, tables: Object.fromEntries(Object.entries(snapshot).map(([name, rows]) => [name, rows.length])), existingDataPreserved: phase === 'after' }));
} finally { await sql.end(); }
