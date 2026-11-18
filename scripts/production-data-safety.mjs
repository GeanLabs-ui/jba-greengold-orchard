import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

const directory = new URL('../test-results/production-safety/', import.meta.url);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');

async function snapshot(url, baseline) {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 30 });
  try {
    return await sql.begin(async tx => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
      const result = {};
      for (const { tablename } of tables) {
        if (/^_|session|rate_limit|verification_token|password_reset/.test(tablename)) continue;
        const records = await tx`SELECT to_jsonb(t) AS row FROM ${tx(tablename)} t`;
        const columns = baseline?.[tablename]?.columns || Object.keys(records[0]?.row || {}).sort();
        result[tablename] = { columns, hashes: records.map(({ row }) => hash(Object.fromEntries(columns.map(key => [key, row[key]])))) };
      }
      return result;
    });
  } finally { await sql.end(); }
}

function compare(before, after) {
  for (const [table, { hashes }] of Object.entries(before)) {
    const counts = new Map();
    for (const item of after[table]?.hashes || []) counts.set(item, (counts.get(item) || 0) + 1);
    for (const item of hashes) {
      const count = counts.get(item) || 0;
      if (!count) throw new Error(`Existing record changed or disappeared in ${table}; inspect the recovery backup`);
      counts.set(item, count - 1);
    }
  }
}

function docker(args, input, env = process.env) {
  const result = spawnSync('docker', args, { input, env, maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Database recovery command failed: ${result.stderr?.toString().slice(0, 2000)}`);
  return result.stdout;
}

await fs.mkdir(directory, { recursive: true });
if (process.argv[2] === 'backup') {
  const versionSql = postgres(databaseUrl, { max: 1, prepare: false });
  let major;
  try {
    const [version] = await versionSql`SELECT current_setting('server_version_num') AS number`;
    major = Math.floor(Number(version.number) / 10000);
  } finally { await versionSql.end(); }
  if (!Number.isInteger(major) || major < 14 || major > 20) throw new Error('Unsupported PostgreSQL recovery version');
  const image = `postgres:${major}-bookworm`;
  const before = await snapshot(databaseUrl);
  const source = new URL(databaseUrl);
  const dump = docker(['run', '--rm', '-e', 'PGPASSWORD', '-e', 'PGSSLMODE=require', image, 'pg_dump',
    '--host=' + source.hostname, '--port=' + (source.port || '5432'), '--username=' + decodeURIComponent(source.username),
    '--dbname=' + source.pathname.slice(1), '--format=custom', '--no-owner', '--no-privileges'], undefined,
  { ...process.env, PGPASSWORD: decodeURIComponent(source.password) });
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
  const publicKey = await fs.readFile(new URL('./release-backup-public.pem', import.meta.url));
  const envelope = { algorithm: 'AES-256-GCM/RSA-OAEP-SHA256', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    wrappedKey: crypto.publicEncrypt({ key: publicKey, oaepHash: 'sha256' }, key).toString('base64'), dumpSha256: hash(dump.toString('base64')) };
  await fs.writeFile(new URL('production.dump.enc', directory), encrypted);
  await fs.writeFile(new URL('recovery-envelope.json', directory), JSON.stringify(envelope, null, 2));
  await fs.writeFile(new URL('before.json', directory), JSON.stringify(before, null, 2));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv); decipher.setAuthTag(cipher.getAuthTag());
  const recovered = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  if (!dump.equals(recovered)) throw new Error('Encrypted backup did not round trip');
  const container = 'jba-release-restore-' + Date.now();
  const password = crypto.randomBytes(24).toString('hex');
  docker(['run', '-d', '--name', container, '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=restore_check', '-p', '127.0.0.1::5432', image], undefined, { ...process.env, POSTGRES_PASSWORD: password });
  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      if (spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Recovery database did not become ready');
    docker(['exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', 'restore_check', '--no-owner', '--no-privileges', '--exit-on-error'], recovered);
    const port = docker(['port', container, '5432']).toString().trim().split(':').at(-1);
    const restored = await snapshot(`postgresql://postgres:${password}@127.0.0.1:${port}/restore_check`, before);
    compare(before, restored);
    await fs.writeFile(new URL('restore-verification.json', directory), JSON.stringify({ restored: true, verifiedAt: new Date().toISOString(), tables: Object.fromEntries(Object.entries(before).map(([table, entry]) => [table, entry.hashes.length])) }, null, 2));
    console.log(`Encrypted backup restored successfully; verified ${Object.keys(before).length} business tables`);
  } finally { docker(['rm', '-f', container]); }
} else if (process.argv[2] === 'verify') {
  const before = JSON.parse(await fs.readFile(new URL('before.json', directory), 'utf8'));
  const after = await snapshot(databaseUrl, before);
  compare(before, after);
  await fs.writeFile(new URL('preservation-verification.json', directory), JSON.stringify({ existingDataPreserved: true, verifiedAt: new Date().toISOString(), tables: Object.fromEntries(Object.entries(after).map(([table, entry]) => [table, entry.hashes.length])) }, null, 2));
  console.log('All baseline business records are preserved');
} else throw new Error('Expected backup or verify');
