import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

// Test against temporary shadow tables, never application records.
const connection = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) throw new Error('Local test database required.');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const migration = await readFile(new URL('../packages/database/migrations/0020_post_harvest_main_activities.sql', import.meta.url), 'utf8');
const activities = JSON.parse(await readFile(new URL('../apps/web/src/data/postHarvestActivities.json', import.meta.url), 'utf8'));
const programme = 'JBA-EARLY-HARVEST-2026-27';
try {
  await sql.begin(async (tx) => {
    await tx`CREATE TEMP TABLE entity_records (LIKE public.entity_records INCLUDING ALL) ON COMMIT DROP`;
    await tx`CREATE TEMP TABLE audit_events (LIKE public.audit_events INCLUDING ALL) ON COMMIT DROP`;
    const originals = [];
    for (const organization of ['test-one', 'test-two', null]) {
      for (let index = 0; index < 18; index += 1) {
        originals.push({ id: `${organization}-${index}`, organization_id: organization, entity_name: 'FarmProject', data: {
          programme_code: programme, project_code: index < 14 ? `DRC-${index}` : `custom-${index}`,
          title: `Original ${index}`, notes: 'Retain notes', progress_percent: index < 3 ? 100 : 0,
          status: index < 3 ? 'completed' : 'not_started', due_date: '2026-09-01',
        } });
      }
    }
    const untouched = [
      { id: 'related', organization_id: 'test-one', entity_name: 'FarmTask', data: { programme_code: programme, parent_project_id: 'test-one-1', notes: 'Keep related task' } },
      { id: 'other-programme', organization_id: 'test-one', entity_name: 'FarmProject', data: { programme_code: 'other', project_code: 'DRC-01' } },
      { id: 'existing-approved', organization_id: 'converted', entity_name: 'FarmProject', data: { programme_code: programme, project_code: 'PH-01', notes: 'Keep local note', progress_percent: 40 } },
      { id: 'existing-archive', organization_id: 'converted', entity_name: 'FarmProject', data: { programme_code: programme, project_code: 'DRC-01', archived_at: '2026-09-01' } },
    ];
    await tx`INSERT INTO entity_records ${tx([...originals, ...untouched], 'id', 'organization_id', 'entity_name', 'data')}`;
    await tx.unsafe(migration);
    const after = await tx`SELECT * FROM entity_records`;
    for (const original of originals) {
      const current = after.find((row) => row.id === original.id);
      assert.ok(current.data.archived_at);
      for (const [key, value] of Object.entries(original.data)) assert.deepEqual(current.data[key], value);
    }
    for (const original of untouched) assert.deepEqual(after.find((row) => row.id === original.id).data, original.data);
    for (const organization of ['test-one', 'test-two', null]) {
      const active = after.filter((row) => row.organization_id === organization && row.entity_name === 'FarmProject' && row.data.programme_code === programme && !row.data.archived_at);
      assert.equal(active.length, 10);
      for (const activity of activities) {
        const record = active.find((row) => row.data.activity_sequence === activity.sequence);
        assert.equal(record.data.title, activity.name);
        assert.equal(record.data.timing, activity.timing);
        assert.equal(record.data.success_criteria, activity.readiness);
        assert.equal(record.data.progress_percent, 0);
      }
    }
    const audits = await tx`SELECT * FROM audit_events`;
    assert.equal(audits.length, 84);
    await tx`DROP TABLE _migration_schedule_originals`;
    await tx.unsafe(migration);
    assert.equal((await tx`SELECT count(*)::integer AS count FROM entity_records`)[0].count, after.length);
    assert.equal((await tx`SELECT count(*)::integer AS count FROM audit_events`)[0].count, audits.length);
    console.log('PASS: exact ten activities per scope; all 54 originals, linked records and converted local schedule preserved; audited and idempotent.');
  });
} finally {
  await sql.end();
}
