import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { migrationChecksums } from '../packages/database/scripts/migration-checksum.mjs';
import { assertMigrationIsNonDestructive } from '../packages/database/scripts/migration-safety.mjs';

const file = '0023_platform_named_views.sql';
const source = await readFile(new URL(`../packages/database/migrations/${file}`, import.meta.url), 'utf8');
assertMigrationIsNonDestructive(file, source);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
const verifyOnly = process.argv.includes('--verify-only');
try {
  await sql.begin(async tx => {
    if (verifyOnly) await tx.unsafe('SET TRANSACTION READ ONLY');
    else await tx`SELECT pg_advisory_xact_lock(hashtext('jba-greengold-migrations'))`;
    const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    const hashes = async () => {
      const result = {};
      for (const { tablename } of tables) {
        if (tablename === '_jba_migrations') continue;
        const [row] = await tx`SELECT count(*)::int AS count, md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS fingerprint FROM ${tx(tablename)} t`;
        result[tablename] = row;
      }
      return result;
    };
    const before = await hashes();
    if (!verifyOnly) {
      const [applied] = await tx`SELECT checksum FROM _jba_migrations WHERE name = ${file}`;
      const checksums = migrationChecksums(source);
      if (applied) assert(checksums.accepted.has(applied.checksum), 'Applied migration checksum mismatch');
      else {
        await tx.unsafe(source);
        await tx`INSERT INTO _jba_migrations (name, checksum) VALUES (${file}, ${checksums.canonical})`;
      }
    }
    const views = [...source.matchAll(/CREATE OR REPLACE VIEW public\.(\w+)[\s\S]*?FROM public\.entity_records WHERE entity_name = '([^']+)'/g)];
    for (const [, view, entity] of views) {
      const [difference] = await tx`SELECT count(*)::int AS count FROM ((SELECT id,data FROM ${tx(view)} EXCEPT SELECT id,data FROM entity_records WHERE entity_name = ${entity}) UNION ALL (SELECT id,data FROM entity_records WHERE entity_name = ${entity} EXCEPT SELECT id,data FROM ${tx(view)})) d`;
      assert.equal(difference.count, 0, `${view} must match canonical records`);
    }
    const [options] = await tx`SELECT count(*)::int AS count FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE 'platform_%' AND relkind = 'v' AND 'security_invoker=true' = ANY(reloptions)`;
    assert.equal(options.count, 69);
    assert.deepEqual(await hashes(), before, 'Existing table rows must remain byte-for-byte equivalent');
    console.log(JSON.stringify({ mode: verifyOnly ? 'verify' : 'apply', views: options.count, entityViewsCompared: views.length, existingTablesPreserved: tables.length - 1, allExistingRowFingerprintsUnchanged: true }));
  });
} finally { await sql.end(); }
