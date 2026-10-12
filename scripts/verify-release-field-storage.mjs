import postgres from 'postgres';
import assert from 'node:assert/strict';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
const examples = [
  ['Equipment', { equipment_code: 'TEST', quantity_purchased: 5, remaining_quantity: 0, repair_cost: 20, record_status: 'Draft', attachments: [], custom_future_field: 'retained' }],
  ['HarvestBatch', { quantity_harvested_kg: 1200, accepted_quantity_kg: 1100, rejected_kg: 100, team_members: ['Test'], time_recorded: '10:30', evidence: [] }],
  ['Issue', { issue_code: 'TEST', report_date: '2026-10-09', report_time: '10:30', estimated_cost: 0, resolution: '', attachments: [] }],
  ['ObjectiveCycle', { year: 2026, revision: 1, objectives: [{ id: 'test', subs: [], kpis: [], blockers: [], evidence: [] }] }],
  ['DailyActivity', { related_objective: 'test', related_sub_objective: 'sub', related_kpi: 'kpi', output_quantity_kg: 0 }],
];
try {
  await sql.begin(async tx => {
    const [column] = await tx`SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'entity_records' AND column_name = 'data'`;
    assert.equal(column?.data_type, 'jsonb', 'Business records must support JSON fields');
    // Session-local clone: no fixtures or updates are written to live business tables.
    await tx`CREATE TEMP TABLE release_field_probe (LIKE public.entity_records INCLUDING DEFAULTS) ON COMMIT DROP`;
    for (const [entity, data] of examples) {
      const id = crypto.randomUUID();
      await tx`INSERT INTO release_field_probe (id, entity_name, data) VALUES (${id}, ${entity}, ${tx.json(data)})`;
      await tx`UPDATE release_field_probe SET data = data || ${tx.json({ release_probe: true })} WHERE id = ${id}`;
      const [saved] = await tx`SELECT data FROM release_field_probe WHERE id = ${id}`;
      assert.deepEqual(saved.data, { ...data, release_probe: true });
    }
  });
  console.log('New inventory, harvest, issue, objective and task-log fields round-trip in PostgreSQL; existing JSON keys and zero values preserved. No live business rows changed.');
} finally { await sql.end(); }
