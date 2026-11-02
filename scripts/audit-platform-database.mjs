import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { migrationChecksums } from '../packages/database/scripts/migration-checksum.mjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const root = new URL('../', import.meta.url);
const schema = await readFile(new URL('packages/database/src/schema.ts', root), 'utf8');
const expected = [...schema.matchAll(/pgTable\('([^']+)',\s*\{([\s\S]*?)\n\}/g)].map(match => ({
  table: match[1], columns: [...match[2].matchAll(/\w+:\s*\w+\('([^']+)'/g)].map(column => column[1]),
}));
const entitySource = await readFile(new URL('apps/api/src/modules/entities.ts', root), 'utf8');
const allowed = new Set([...entitySource.match(/const ENTITY_NAMES = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([^"]+)"/g)].map(match => match[1]));
allowed.add('ObjectiveCycle'); // Dedicated objectives API stores cycles in the same JSON table.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
try {
  const report = await sql.begin(async tx => {
    await tx.unsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const columns = await tx`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`;
    const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    const counts = {};
    for (const { tablename } of tables) {
      const [row] = await tx`SELECT count(*)::int AS count FROM ${tx(tablename)}`;
      counts[tablename] = row.count;
    }
    const entities = await tx`SELECT entity_name, count(*)::int AS rows, count(*) FILTER (WHERE jsonb_typeof(data) <> 'object')::int AS invalid_objects FROM entity_records GROUP BY entity_name ORDER BY entity_name`;
    const [orphans] = await tx`SELECT count(*)::int AS count FROM farm_blocks b LEFT JOIN farms f ON f.id = b.farm_id WHERE f.id IS NULL`;
    const [duplicates] = await tx`SELECT count(*)::int AS count FROM (SELECT organization_id, data->>'year' FROM entity_records WHERE entity_name = 'ObjectiveCycle' GROUP BY organization_id, data->>'year' HAVING count(*) > 1) d`;
    const applied = counts._jba_migrations !== undefined ? await tx`SELECT name, checksum FROM _jba_migrations ORDER BY name` : [];
    const migrationFiles = (await readdir(new URL('packages/database/migrations/', root))).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    const pendingMigrations = [], modifiedAppliedMigrations = [];
    for (const name of migrationFiles) {
      const entry = applied.find(row => row.name === name);
      if (!entry) pendingMigrations.push(name);
      else if (!migrationChecksums(await readFile(new URL(`packages/database/migrations/${name}`, root), 'utf8')).accepted.has(entry.checksum)) modifiedAppliedMigrations.push(name);
    }
    const missingColumns = expected.flatMap(({ table, columns: names }) => names.filter(name => !columns.some(column => column.table_name === table && column.column_name === name)).map(column => `${table}.${column}`));
    return {
      auditedAt: new Date().toISOString(), environment: ['localhost', '127.0.0.1', '::1'].includes(new URL(process.env.DATABASE_URL).hostname) ? 'local' : 'remote',
      readOnly: true, tableCounts: counts, entities, missingColumns, pendingMigrations, modifiedAppliedMigrations,
      unrecognizedEntityNames: entities.filter(row => !allowed.has(row.entity_name)).map(row => row.entity_name),
      orphanFarmBlocks: orphans.count, duplicateObjectiveYears: duplicates.count,
      storage: { farms: 'farms', blocks: 'farm_blocks', issues: 'entity_records:Issue', inventory: 'entity_records:Equipment', harvests: 'entity_records:HarvestBatch', objectives: 'entity_records:ObjectiveCycle', taskLog: 'entity_records:DailyActivity' },
    };
  });
  const output = new URL('output/database-audit/', root);
  await mkdir(output, { recursive: true });
  await writeFile(new URL(`${report.environment}-latest.json`, output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally { await sql.end(); }
