import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

// Read-only deployment evidence. Never prints notes, identities or credentials.
const activities = JSON.parse(await readFile(new URL('../apps/web/src/data/postHarvestActivities.json', import.meta.url), 'utf8'));
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const records = await sql`SELECT id, organization_id, data FROM entity_records
    WHERE entity_name = 'FarmProject' AND data->>'programme_code' = 'JBA-EARLY-HARVEST-2026-27'`;
  const scopes = [...new Set(records.filter((row) => /^PH-\d{2}$/.test(row.data.project_code)).map((row) => row.organization_id))];
  assert.ok(scopes.length > 0, 'No approved Main Activities schedule found.');
  for (const scope of scopes) {
    const active = records.filter((row) => row.organization_id === scope && !row.data.archived_at);
    // Additional user-created activities remain valid after this release.
    for (const activity of activities) {
      const matching = active.filter((row) => row.data.project_code === `PH-${String(activity.sequence).padStart(2, '0')}`);
      assert.equal(matching.length, 1, `Activity ${activity.sequence} must occur exactly once.`);
      const { data } = matching[0];
      assert.equal(data.title, activity.name);
      assert.equal(data.timing, activity.timing);
      assert.equal(data.success_criteria, activity.readiness);
      assert.equal(data.activity_sequence, activity.sequence);
    }
  }
  const audits = await sql`SELECT record_id, old_values FROM audit_events
    WHERE target_table = 'FarmProject' AND action = 'update'
      AND new_values->>'schedule_migration' = '0020_post_harvest_main_activities'
      AND coalesce(old_values->>'archived_at', '') = ''`;
  for (const audit of audits) {
    const record = records.find((row) => row.id === audit.record_id);
    assert.ok(record?.data.archived_at, 'Original schedule must remain archived.');
    for (const [key, value] of Object.entries(audit.old_values)) {
      if (['archived_at', 'replaced_by_schedule', 'schedule_migration'].includes(key)) continue;
      assert.deepEqual(record.data[key], value, `Original field ${key} must be preserved.`);
    }
  }
  console.log(JSON.stringify({ verified: true, approvedSchedules: scopes.length, activitiesPerSchedule: activities.length,
    activeActivities: records.filter((row) => !row.data.archived_at).length,
    preservedPreviousActivities: audits.length }));
} finally {
  await sql.end();
}
