import postgres from 'postgres';

const sourceUrl = process.env.LEGACY_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  throw new Error('LEGACY_DATABASE_URL and DATABASE_URL are required');
}
if (sourceUrl === targetUrl) throw new Error('Legacy and target databases must be different');

const source = postgres(sourceUrl, { max: 1, prepare: false });
const target = postgres(targetUrl, { max: 1, prepare: false });
const preservedEntityNames = [
  'AuditLog', 'Customer', 'Inquiry', 'Invoice', 'JobApplication', 'Notification', 'Order', 'FarmNote',
];

try {
  const [sourceMigrations, targetMigrations] = await Promise.all([
    source`SELECT name FROM _jba_migrations ORDER BY name`,
    target`SELECT name FROM _jba_migrations ORDER BY name`,
  ]);
  if (!targetMigrations.some((row) => row.name === '0010_farm_single_source.sql')) {
    throw new Error('Target database is not the canonical migrated database');
  }
  if (sourceMigrations.some((row) => row.name === '0010_farm_single_source.sql')) {
    throw new Error('Source already uses the canonical farm schema; refusing an ambiguous merge');
  }

  const [users, files, entities, auditEvents, sourceMilestone, targetMilestone] = await Promise.all([
    source`SELECT * FROM users ORDER BY created_at`,
    source`SELECT * FROM file_objects ORDER BY created_at`,
    source`
      SELECT * FROM entity_records
      WHERE entity_name = ANY(${preservedEntityNames})
        OR (entity_name IN ('FarmProject', 'FarmTask') AND data->>'source' = 'Master Schedule')
      ORDER BY created_at
    `,
    source`SELECT * FROM audit_events ORDER BY timestamp`,
    source`SELECT * FROM entity_records WHERE entity_name = 'FarmProject' AND data->>'project_code' = 'DRC-M-01' LIMIT 1`,
    target`SELECT * FROM entity_records WHERE entity_name = 'FarmProject' AND data->>'project_code' = 'DRC-M-01' LIMIT 1`,
  ]);

  const sourceMilestoneId = sourceMilestone[0]?.id || null;
  const targetMilestoneId = targetMilestone[0]?.id || null;
  const remapRecordId = (value) => value === sourceMilestoneId && targetMilestoneId ? targetMilestoneId : value;
  const remapData = (data) => {
    const next = structuredClone(data || {});
    for (const key of ['parent_project_id', 'project_id', 'farm_project_id']) {
      if (key in next) next[key] = remapRecordId(next[key]);
    }
    return next;
  };

  const summary = await target.begin(async (transaction) => {
    let insertedUsers = 0;
    let insertedFiles = 0;
    let insertedEntities = 0;
    let insertedAudits = 0;

    for (const user of users) {
      const rows = await transaction`
        INSERT INTO users (
          id, email, password_hash, password_salt, full_name, role, status,
          email_verified_at, last_login_at, created_at, updated_at
        ) VALUES (
          ${user.id}, ${user.email}, ${user.password_hash}, ${user.password_salt}, ${user.full_name},
          ${user.role}, ${user.status}, ${user.email_verified_at}, ${user.last_login_at},
          ${user.created_at}, ${user.updated_at}
        ) ON CONFLICT (email) DO NOTHING RETURNING id
      `;
      insertedUsers += rows.length;
    }

    for (const entity of entities) {
      const rows = await transaction`
        INSERT INTO entity_records (
          id, entity_name, organization_id, owner_user_id, data,
          created_by, updated_by, created_at, updated_at
        ) VALUES (
          ${entity.id}, ${entity.entity_name}, ${entity.organization_id}, ${entity.owner_user_id},
          ${target.json(remapData(entity.data))}, ${entity.created_by}, ${entity.updated_by},
          ${entity.created_at}, ${entity.updated_at}
        ) ON CONFLICT (id) DO NOTHING RETURNING id
      `;
      insertedEntities += rows.length;
    }

    for (const file of files) {
      const rows = await transaction`
        INSERT INTO file_objects (
          id, object_key, original_name, content_type, size_bytes,
          owner_user_id, record_id, status, created_at
        ) VALUES (
          ${file.id}, ${file.object_key}, ${file.original_name}, ${file.content_type}, ${file.size_bytes},
          ${file.owner_user_id}, ${remapRecordId(file.record_id)}, ${file.status}, ${file.created_at}
        ) ON CONFLICT (id) DO NOTHING RETURNING id
      `;
      insertedFiles += rows.length;
    }

    for (const event of auditEvents) {
      const rows = await transaction`
        INSERT INTO audit_events (
          id, user_id, action, target_table, record_id, old_values,
          new_values, ip_address, timestamp
        ) VALUES (
          ${event.id}, ${event.user_id}, ${event.action}, ${event.target_table},
          ${remapRecordId(event.record_id)}, ${event.old_values ? target.json(event.old_values) : null},
          ${event.new_values ? target.json(event.new_values) : null}, ${event.ip_address}, ${event.timestamp}
        ) ON CONFLICT (id) DO NOTHING RETURNING id
      `;
      insertedAudits += rows.length;
    }

    let restoredProgress = 0;
    if (sourceMilestone[0] && targetMilestone[0] && targetMilestone[0].data?.status === 'not_started') {
      const sourceData = sourceMilestone[0].data || {};
      const progressFields = {
        status: sourceData.status,
        progress_percent: sourceData.progress_percent,
        rag: sourceData.rag,
        started_at: sourceData.started_at,
        start_time: sourceData.start_time,
        updated_from: 'Legacy database consolidation',
      };
      const rows = await transaction`
        UPDATE entity_records
        SET data = data || ${target.json(progressFields)}, updated_at = ${sourceMilestone[0].updated_at}
        WHERE id = ${targetMilestone[0].id} AND data->>'status' = 'not_started'
        RETURNING id
      `;
      restoredProgress = rows.length;
    }

    return { insertedUsers, insertedFiles, insertedEntities, insertedAudits, restoredProgress };
  });

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await Promise.allSettled([source.end(), target.end()]);
}
