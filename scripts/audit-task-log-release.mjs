import { mkdir, writeFile, readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { seal, unseal, fingerprint } from './data-import/secure-payload.mjs';

const phase = process.argv[2];
if (!['before', 'after', 'local'].includes(phase)) throw new Error('Expected snapshot phase');
const key = process.env.BOOK5_IMPORT_KEY;
if (!key || !process.env.DATABASE_URL) throw new Error('Database and snapshot encryption configuration required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10 });
const output = new URL('../test-results/task-log-release/', import.meta.url);
try {
  await mkdir(output, { recursive: true });
  const snapshot = await sql.begin(async tx => {
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    const records = await tx`SELECT id, organization_id, data, created_at, updated_at FROM entity_records WHERE entity_name = 'DailyActivity' ORDER BY id`;
    const farms = await tx`SELECT id, organization_id, farm_code, name FROM farms ORDER BY id`;
    const blocks = await tx`SELECT id, farm_id, organization_id, block_code, name FROM farm_blocks ORDER BY id`;
    return { records, farms, blocks };
  });
  await writeFile(new URL(`${phase}.enc`, output), seal(snapshot, key));
  if (phase === 'after') {
    const before = unseal(await readFile(new URL('before.enc', output), 'utf8'), key);
    if (fingerprint(before) !== fingerprint(snapshot)) throw new Error('Task-log data changed during deployment; inspect encrypted snapshots');
  }
  console.log(`Encrypted ${phase} snapshot captured: ${snapshot.records.length} task-log records${phase === 'after' ? '; all records and dates unchanged across deployment' : ''}.`);
} finally { await sql.end(); }
