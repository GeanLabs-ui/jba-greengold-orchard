import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { seal, unseal, fingerprint } from './data-import/secure-payload.mjs';

const phase = process.argv[2];
const dir = new URL('../.backups/release-20261102/', import.meta.url);
const key = process.env.BOOK5_IMPORT_KEY;
const uri = process.env.DATABASE_URL;
if (!key || !uri || !['before', 'after', 'restore'].includes(phase)) throw new Error('Release phase and protected database/encryption configuration required');
const connection = new URL(uri);
if (!connection.hostname.startsWith('ep-jolly-cell-ayr7xsuo')) throw new Error('Unexpected production database');
const sha = data => createHash('sha256').update(data).digest('hex');
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120_000, ...options });
  if (result.error || result.status !== 0) throw new Error(`Release safety command failed: ${command}; exit ${result.status}`);
  return result.stdout;
};
async function snapshot() {
  const db = postgres(uri, { max: 1, prepare: false, connect_timeout: 20 });
  try {
    return await db.begin(async tx => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
      const output = {};
      for (const { tablename } of tables) {
        if (/^_|session|rate_limit|verification_token|password_reset/i.test(tablename)) continue;
        output[tablename] = (await tx`SELECT to_jsonb(t) AS row FROM ${tx(tablename)} t`).map(r => r.row);
      }
      return output;
    });
  } finally { await db.end(); }
}
await mkdir(dir, { recursive: true });
if (phase === 'before') {
  const baseline = await snapshot();
  await writeFile(new URL('before.enc', dir), seal(baseline, key));
  const dump = new URL('production.dump', dir);
  const env = { ...process.env, PGHOST: connection.hostname, PGPORT: connection.port || '5432', PGDATABASE: decodeURIComponent(connection.pathname.slice(1)), PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password), PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '20' };
  run('docker', ['exec', '-e', 'PGHOST', '-e', 'PGPORT', '-e', 'PGDATABASE', '-e', 'PGUSER', '-e', 'PGPASSWORD', '-e', 'PGSSLMODE', '-e', 'PGCONNECT_TIMEOUT', 'farm-release-restore-20261102', 'pg_dump', '--format=custom', '--no-owner', '--no-acl', '--file=/tmp/production.dump'], { env });
  run('docker', ['cp', 'farm-release-restore-20261102:/tmp/production.dump', fileURLToPath(dump)]);
  const bytes = await readFile(dump);
  const encrypted = seal({ format: 'pg_dump_custom', sha256: sha(bytes), dump: bytes.toString('base64') }, key);
  await writeFile(new URL('production-dump.enc', dir), encrypted);
  await rm(dump);
  await writeFile(new URL('manifest.json', dir), JSON.stringify({ createdAt: new Date().toISOString(), ciphertextSha256: sha(encrypted), plaintextSha256: sha(bytes), tables: Object.fromEntries(Object.entries(baseline).map(([name, rows]) => [name, rows.length])) }, null, 2));
  console.log(JSON.stringify({ phase, encryptedDumpBytes: Buffer.byteLength(encrypted), tables: Object.fromEntries(Object.entries(baseline).map(([name, rows]) => [name, rows.length])) }));
} else if (phase === 'restore') {
  const envelope = unseal(await readFile(new URL('production-dump.enc', dir), 'utf8'), key);
  const bytes = Buffer.from(envelope.dump, 'base64');
  if (sha(bytes) !== envelope.sha256) throw new Error('Decrypted archive checksum mismatch');
  const file = new URL('restore.dump', dir);
  await writeFile(file, bytes);
  try {
    run('docker', ['cp', fileURLToPath(file), 'farm-release-restore-20261102:/tmp/restore.dump']);
    run('docker', ['exec', 'farm-release-restore-20261102', 'createdb', '-U', 'postgres', 'release_restore_20261102']);
    run('docker', ['exec', 'farm-release-restore-20261102', 'pg_restore', '-U', 'postgres', '-d', 'release_restore_20261102', '--no-owner', '--no-acl', '--exit-on-error', '/tmp/restore.dump']);
    const baseline = unseal(await readFile(new URL('before.enc', dir), 'utf8'), key);
    const verified = {};
    for (const [table, rows] of Object.entries(baseline)) {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Unexpected table identifier');
      const raw = run('docker', ['exec', 'farm-release-restore-20261102', 'psql', '-U', 'postgres', '-d', 'release_restore_20261102', '-At', '-c', `SELECT coalesce(json_agg(to_jsonb(t)), '[]'::json) FROM "${table}" t`]);
      const restored = JSON.parse(raw);
      const expected = rows.map(fingerprint).sort();
      if (JSON.stringify(restored.map(fingerprint).sort()) !== JSON.stringify(expected)) throw new Error(`Restored data mismatch in ${table}`);
      verified[table] = rows.length;
    }
    await writeFile(new URL('restore-verification.json', dir), JSON.stringify({ verifiedAt: new Date().toISOString(), restoredExactly: true, tables: verified }, null, 2));
    console.log(JSON.stringify({ restoredExactly: true, tables: verified }));
  } finally { await rm(file); }
} else {
  const before = unseal(await readFile(new URL('before.enc', dir), 'utf8'), key);
  const after = await snapshot();
  for (const [table, rows] of Object.entries(before)) {
    const hashes = new Map();
    for (const row of after[table] || []) { const hash = fingerprint(row); hashes.set(hash, (hashes.get(hash) || 0) + 1); }
    for (const row of rows) { const hash = fingerprint(row), count = hashes.get(hash) || 0; if (!count) throw new Error(`Existing data changed or disappeared in ${table}`); hashes.set(hash, count - 1); }
  }
  await writeFile(new URL('after.enc', dir), seal(after, key));
  console.log(JSON.stringify({ existingDataPreserved: true, tables: Object.fromEntries(Object.entries(after).map(([name, rows]) => [name, rows.length])) }));
}
