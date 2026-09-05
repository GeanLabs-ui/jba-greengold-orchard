import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postgres from 'postgres';
import { assertMigrationIsNonDestructive } from './migration-safety.mjs';
import { migrationChecksums } from './migration-checksum.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const migrationDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const files = (await readdir(migrationDirectory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
const sql = postgres(connectionString, { max: 1, prepare: false });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS _jba_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const file of files) {
    const source = await readFile(path.join(migrationDirectory, file), 'utf8');
    assertMigrationIsNonDestructive(file, source);
    const { canonical, accepted } = migrationChecksums(source);
    await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext('jba-greengold-migrations'))`;
      const existing = await transaction`SELECT checksum FROM _jba_migrations WHERE name = ${file}`;
      if (existing[0]) {
        if (!accepted.has(existing[0].checksum)) throw new Error(`Applied migration was modified: ${file}`);
        return;
      }
      await transaction.unsafe(source.replaceAll('--> statement-breakpoint', ''));
      await transaction`INSERT INTO _jba_migrations (name, checksum) VALUES (${file}, ${canonical})`;
      console.log(`Applied ${file}`);
    });
  }
} finally {
  await sql.end();
}
