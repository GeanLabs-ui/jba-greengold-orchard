import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { MILESTONE_BLUEPRINTS, PROGRAMME_CODE } from '../apps/web/src/data/dailyRoutineProgramme.js';

// Explicit, local-only import. Existing milestones are retained in Previous Schedule.
// Preview: node --env-file=.env scripts/replace-local-master-schedule.mjs
// Apply:   node --env-file=.env scripts/replace-local-master-schedule.mjs --apply
const connection = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname)) {
  throw new Error('This import only supports the local database.');
}
const apply = process.argv.includes('--apply');
const activities = JSON.parse(await readFile(new URL('../apps/web/src/data/postHarvestActivities.json', import.meta.url), 'utf8'));
if (activities.length !== 10 || activities.some((activity, index) => activity.sequence !== index + 1)) {
  throw new Error('Expected the ten numbered activities from Management Review.');
}
const source = 'Mango_Post_Harvest_Management_Review_Final (1).xlsx';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const before = await tx`SELECT * FROM entity_records
      WHERE entity_name = 'FarmProject' AND data->>'programme_code' = ${PROGRAMME_CODE}
      ORDER BY id FOR UPDATE`;
    const organizations = [...new Set(before.map((record) => record.organization_id))];
    if (organizations.length !== 1) throw new Error('Expected a single existing local programme organization.');
    const organizationId = organizations[0];
    const legacyCodes = new Set(MILESTONE_BLUEPRINTS.map((item) => `DRC-${item.code}`));
    const previous = before.filter((record) => legacyCodes.has(record.data.project_code) && !record.data.archived_at);
    const fresh = activities.filter((activity) => !before.some((record) => record.data.project_code === `PH-${String(activity.sequence).padStart(2, '0')}`));
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', retainedMilestones: previous.map((record) => ({ id: record.id, code: record.data.project_code, title: record.data.title, status: record.data.status })), newActivities: fresh.map((item) => ({ sequence: item.sequence, title: item.name })) }, null, 2));
    if (!apply) return;

    const stamp = new Date().toISOString();
    const related = await tx`SELECT * FROM entity_records WHERE
      data->>'parent_project_id' IN ${sql(before.map((record) => record.id))}
      OR data->>'project_id' IN ${sql(before.map((record) => record.id))}`;
    const backupDirectory = resolve('.backups/master-schedule');
    await mkdir(backupDirectory, { recursive: true });
    const backupPath = resolve(backupDirectory, `${stamp.replaceAll(':', '-')}.json`);
    await writeFile(backupPath, JSON.stringify({ source, programme: PROGRAMME_CODE, records: before, related }, null, 2), { flag: 'wx' });
    console.log(`Backup: ${backupPath}`);

    for (const record of previous) {
      const patch = { archived_at: stamp, replaced_by_schedule: source };
      await tx`UPDATE entity_records SET data = data || ${sql.json(patch)}, updated_at = now() WHERE id = ${record.id}`;
      await tx`INSERT INTO audit_events (id, action, target_table, record_id, old_values, new_values)
        VALUES (${randomUUID()}, 'update', 'FarmProject', ${record.id}, ${sql.json(record.data)}, ${sql.json({ ...record.data, ...patch })})`;
    }
    for (const activity of fresh) {
      const code = `PH-${String(activity.sequence).padStart(2, '0')}`;
      const id = `post-harvest:${organizationId || 'local'}:${PROGRAMME_CODE}:${activity.sequence}`;
      const data = {
        programme_code: PROGRAMME_CODE, project_code: code, milestone_code: code,
        project_type: 'master_schedule_task', title: activity.name, activity_id: activity.id,
        activity_sequence: activity.sequence, timing: activity.timing, success_criteria: activity.readiness,
        source, is_enabled: true, priority: 'Medium', status: 'not_started', progress_percent: 0,
        start_date: '', due_date: '', owner_id: '', owner_name: '', notes: '',
      };
      await tx`INSERT INTO entity_records (id, entity_name, organization_id, data)
        VALUES (${id}, 'FarmProject', ${organizationId}, ${sql.json(data)})`;
      await tx`INSERT INTO audit_events (id, action, target_table, record_id, new_values)
        VALUES (${randomUUID()}, 'create', 'FarmProject', ${id}, ${sql.json(data)})`;
    }
    const after = await tx`SELECT * FROM entity_records WHERE entity_name = 'FarmProject' AND data->>'programme_code' = ${PROGRAMME_CODE}`;
    for (const original of before) {
      const current = after.find((record) => record.id === original.id);
      if (!current || Object.entries(original.data).some(([key, value]) => JSON.stringify(current.data[key]) !== JSON.stringify(value))) {
        throw new Error(`Original schedule data changed unexpectedly: ${original.id}`);
      }
    }
    for (const activity of activities) {
      const record = after.find((row) => row.data.project_code === `PH-${String(activity.sequence).padStart(2, '0')}`);
      if (!record || record.data.title !== activity.name || record.data.timing !== activity.timing || record.data.success_criteria !== activity.readiness || record.data.activity_id !== activity.id) {
        throw new Error(`Workbook activity ${activity.sequence} did not match after import.`);
      }
    }
    console.log(JSON.stringify({ verified: true, workbookActivities: activities.length, retainedOriginals: before.length, retainedRelatedRecords: related.length, totalProgrammeRecords: after.length }));
  });
} finally {
  await sql.end();
}
