import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { assertMigrationIsNonDestructive } from '../packages/database/scripts/migration-safety.mjs';
import { migrationChecksums } from '../packages/database/scripts/migration-checksum.mjs';

// Target only the missing additive account schema, never replay older migrations.
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '54329') throw new Error('Local database only');
const name = '0019_customer_account_setup.sql';
const source = await readFile(new URL(`../packages/database/migrations/${name}`, import.meta.url), 'utf8');
assertMigrationIsNonDestructive(name, source);
const { canonical, accepted } = migrationChecksums(source);
const sql = postgres(url.toString(), { max: 1, prepare: false });
try {
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('jba-greengold-migrations'))`;
    const [existing] = await tx`SELECT checksum FROM _jba_migrations WHERE name = ${name}`;
    if (existing) {
      if (!accepted.has(existing.checksum)) throw new Error('Account migration checksum mismatch');
      return;
    }
    await tx.unsafe(source);
    await tx`INSERT INTO _jba_migrations (name, checksum) VALUES (${name}, ${canonical})`;
  });
  console.log('Additive account schema ready. Existing records preserved.');
} finally { await sql.end(); }
