import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { assertMigrationIsNonDestructive } from '../packages/database/scripts/migration-safety.mjs';
import { migrationChecksums } from '../packages/database/scripts/migration-checksum.mjs';

const url = new URL(process.env.DATABASE_URL || 'invalid:');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '15432' || url.pathname !== '/mango_farm') {
  throw new Error('Restricted to the existing local mango_farm database on port 15432.');
}
const backup = spawnSync(process.execPath, ['scripts/backup-local-database.mjs'], { stdio: 'inherit', env: process.env });
if (backup.status !== 0) throw new Error('Stopped because the local backup did not complete.');
const sql = postgres(url.toString(), { max: 1, prepare: false });
try {
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('jba-greengold-migrations'))`;
    const name = '0024_block_profile_image.sql';
    const source = await readFile(new URL(`../packages/database/migrations/${name}`, import.meta.url), 'utf8');
    assertMigrationIsNonDestructive(name, source);
    const checksum = migrationChecksums(source);
    const rows = await tx`SELECT checksum FROM _jba_migrations WHERE name = ${name}`;
    if (rows[0]) {
      if (!checksum.accepted.has(rows[0].checksum)) throw new Error(`Applied migration was modified: ${name}`);
      return;
    }
    await tx.unsafe(source);
    await tx`INSERT INTO _jba_migrations (name, checksum) VALUES (${name}, ${checksum.canonical})`;
  });
  console.log('Block profile image storage is ready. Existing records are preserved.');
} finally { await sql.end(); }
