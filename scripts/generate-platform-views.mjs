import { readFile, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import JSON5 from 'json5';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('apps/api/src/modules/entities.ts', root), 'utf8');
const names = [...source.match(/const ENTITY_NAMES = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([^"]+)"/g)].map(match => match[1]).filter(name => !['Farm', 'FarmBlock', 'User'].includes(name));
names.push('ObjectiveCycle');
const special = { DailyActivity: 'daily_activities', Equipment: 'inventory_items', Issue: 'issues', HarvestBatch: 'harvest_batches', ObjectiveCycle: 'objective_cycles' };
const fields = {
  Equipment: ['equipment_code', 'equipment_name', 'category', 'condition', 'purchase_date', 'purchase_cost', 'supplier', 'quantity_purchased', 'remaining_quantity', 'minimum_stock_threshold', 'unit', 'repair_status', 'repair_cost', 'record_status', 'attachments'],
  Issue: ['issue_code', 'title', 'report_date', 'report_time', 'category', 'priority', 'description', 'action_required', 'escalate', 'estimated_cost', 'related_task', 'resolution', 'attachments'],
  HarvestBatch: ['harvest_code', 'batch_number', 'harvest_date', 'time_recorded', 'mango_variety', 'quantity_harvested_kg', 'accepted_quantity_kg', 'rejected_kg', 'harvest_cost', 'team_name', 'supervisor_name', 'team_members', 'evidence'],
  ObjectiveCycle: ['year', 'revision', 'objectives', 'review', 'closed_at', 'snapshot', 'history'],
  DailyActivity: ['date', 'activity_date', 'activity_type', 'activity_name', 'related_objective', 'related_sub_objective', 'related_kpi', 'output_quantity_kg', 'total_cost', 'notes'],
};
const snake = name => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
const plural = name => name.endsWith('y') && !/[aeiou]y$/.test(name) ? `${name.slice(0, -1)}ies` : /s$/.test(name) ? `${name}es` : `${name}s`;
const mappings = names.sort().map(entity => ({ entity, view: `platform_${special[entity] || plural(snake(entity))}` }));
// Discover names only, never record values, and freeze the resulting view SQL in a migration.
const discovered = {};
if (process.env.DATABASE_URL) {
  const db = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 15 });
  try {
    const keys = await db.begin(async tx => {
      await tx.unsafe('SET TRANSACTION READ ONLY');
      return tx`SELECT DISTINCT entity_name, k AS field FROM entity_records CROSS JOIN LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(data) = 'object' THEN data ELSE '{}'::jsonb END) k ORDER BY entity_name, k`;
    });
    for (const { entity_name, field } of keys) (discovered[entity_name] ||= []).push(field);
  } finally { await db.end(); }
}
let sql = '-- Additive named views over canonical storage. No business records are copied or rewritten.\n-- security_invoker preserves the querying role permissions and underlying RLS policies.\n-- Keep these views for rollback compatibility; roll back application code without removing data.\nSET LOCAL lock_timeout = \'5s\';\n';
for (const { entity, view } of mappings) {
  let referenceFields = [];
  try {
    const reference = await readFile(new URL(`base44/entities/${entity}.jsonc`, root), 'utf8');
    const parsed = JSON5.parse(reference);
    referenceFields = Object.keys(parsed.properties || {});
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const reserved = new Set(['id', 'entity_name', 'organization_id', 'owner_user_id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'farm_id', 'block_id', 'status', 'data']);
  const columnNames = [...new Set([...(fields[entity] || []), ...referenceFields, ...(discovered[entity] || [])])].filter(field => /^[a-z][a-z0-9_]{0,62}$/.test(field) && !reserved.has(field)).sort();
  const extra = columnNames.map(field => `  data->'${field}' AS "${field}",`).join('\n');
  sql += `\nCREATE OR REPLACE VIEW public.${view} WITH (security_invoker = true) AS\nSELECT id, entity_name, organization_id, owner_user_id, created_by, updated_by, created_at, updated_at,\n  data->>'farm_id' AS farm_id, data->>'block_id' AS block_id, data->>'status' AS status,\n${extra ? `${extra}\n` : ''}  data\nFROM public.entity_records WHERE entity_name = '${entity}';\nCOMMENT ON VIEW public.${view} IS 'Current ${entity} records from entity_records. Read through this view; save through the authenticated application API. The data column retains every historical and future field.';\nREVOKE ALL ON public.${view} FROM PUBLIC;\n`;
}
for (const [view, table] of [['platform_farms', 'farms'], ['platform_farm_blocks', 'farm_blocks'], ['platform_users', 'users'], ['platform_system_log', 'audit_events']]) {
  // Users expose no credentials or authentication secrets.
  const projection = table === 'users' ? 'id, email, full_name, role, status, page_access, created_at, updated_at' : '*';
  sql += `\nCREATE OR REPLACE VIEW public.${view} WITH (security_invoker = true) AS SELECT ${projection} FROM public.${table};\nCOMMENT ON VIEW public.${view} IS 'Canonical ${table} records. Read through this view; save through the authenticated application API.';\nREVOKE ALL ON public.${view} FROM PUBLIC;\n`;
}
await writeFile(new URL('packages/database/migrations/0023_platform_named_views.sql', root), sql);
await writeFile(new URL('docs/PLATFORM_DATABASE_VIEWS.md', root), `# Platform database views\n\nMigration 0023 adds named public.platform_* SQL views without moving records, changing IDs, rewriting JSON, or changing application save routes. New records and edits appear immediately because views query the canonical tables. These are views, not new physical tables.\n\nFarm, block, user and System Log views use their relational tables. Other views use entity_records filtered by the exact API entity name. Existing similarly named legacy tables are retained; do not assume they are the current source of truth.\n\nAll views use security_invoker and grant no access to PUBLIC. Existing database permissions and RLS still apply. They are for authorized database inspection and reporting; they do not replace API authorization. Do not expose them through a browser Data API.\n\nFeature columns extracted with the JSON operator retain original JSON types, zeroes, empty arrays and historical values. Missing keys appear as SQL NULL; the data column preserves every existing and future field. No legacy name or value is silently normalized. Save through the application API to retain validation, organization checks and audit events.\n\n| Feature/entity | SQL view |\n| --- | --- |\n${mappings.map(m => `| ${m.entity} | public.${m.view} |`).join('\n')}\n| Farm | public.platform_farms |\n| FarmBlock | public.platform_farm_blocks |\n| User (no credential columns) | public.platform_users |\n| System Log | public.platform_system_log |\n\n## Validation and rollback\n\nRun the migration on an isolated database first. Compare every view ID and data value with its canonical source using EXCEPT in both directions. Verify existing row fingerprints before and after application. Apply only 0023 when the intent is named views; do not run unrelated pending data migrations. Roll back application changes without dropping views or records. These views require PostgreSQL 15 or newer.\n`);
console.log(`Generated ${mappings.length + 4} platform views.`);
