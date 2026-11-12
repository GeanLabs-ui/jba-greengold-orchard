import { closeDatabase, createDatabase } from './db.js';

const root = '/admin/farm-daily-activities';
const finished = new Set(['completed', 'approved', 'cancelled', 'canceled', 'archived', 'rejected', 'deferred', 'inactive', 'merged']);
const taskEntities = new Set(['FarmProject', 'FarmTask', 'DailyActivity', 'WorkOrder']);

export function operationAlert(entity: string, id: string, data: Record<string, unknown>, now = new Date()) {
  if (!taskEntities.has(entity)) return null;
  const status = String(data.status || 'pending').trim().toLowerCase().replaceAll('_', ' ');
  if (finished.has(status) || data.archived_at || data.is_archived === true || Number(data.progress_percent) >= 100) return null;
  const due = String(data.completion_due_at || data.due_date || data.scheduled_date || '');
  const deadline = due.length === 10 ? `${due}T23:59:59.999Z` : due;
  const delayed = ['delayed', 'blocked', 'overdue'].includes(status) || (Boolean(deadline) && new Date(deadline).getTime() < now.getTime());
  if (!delayed) return null;
  const parent = data.parent_project_id || data.project_id || data.farm_project_id;
  const record = encodeURIComponent(id);
  let destination = `${root}/activities/records?record=${record}&entity=${entity}`;
  if (entity === 'FarmProject') destination = `${root}/activities/master-schedule/${record}`;
  if (entity === 'FarmTask' && parent) {
    destination = `${root}/activities/master-schedule/${encodeURIComponent(String(parent))}?subtask=${record}`;
  }
  return {
    title: 'Task delayed',
    message: `${String(data.title || data.activity_title || data.activity_code || data.work_order_code || data.task_code || 'Scheduled activity')} needs attention${due ? ` · Due ${due}` : ''}.`,
    type: 'delay', notification_type: 'delay',
    channel: 'Admin', status: 'new', entity_name: entity, record_id: id, destination,
    reminder_key: `${entity}:${id}:delay:${due}`,
  };
}

// The deletion audit is a durable dismissal: polling must not recreate an alert
// that an administrator has already removed. A changed deadline is a new alert.
export async function runOperationNotifications(env: Env, now = new Date()) {
  const sql = createDatabase(env);
  try {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(72419302)`;
      const rows = await tx<{ id: string; entity_name: string; organization_id: string | null; data: Record<string, unknown> }[]>`
        SELECT id, entity_name, organization_id, data FROM entity_records
        WHERE entity_name IN ('FarmProject', 'FarmTask', 'DailyActivity', 'WorkOrder')
      `;
      const existing = await tx<{ id: string; key: string; destination: string }[]>`
        SELECT id, data->>'reminder_key' AS key, data->>'destination' AS destination
        FROM entity_records WHERE entity_name = 'Notification' AND data->>'type' = 'delay' AND data ? 'reminder_key'
      `;
      const dismissed = await tx<{ key: string }[]>`
        SELECT old_values->>'reminder_key' AS key FROM audit_events
        WHERE target_table = 'Notification' AND action = 'delete' AND old_values->>'type' = 'delay' AND old_values ? 'reminder_key'
      `;
      // Older alerts appended the task status to the deadline. Match those keys
      // so a status change within the same deadline preserves reads and dismissals.
      const legacyKey = (key: string) => key.replace(/:[a-z][a-z -]*$/i, '');
      const currentAlerts = new Map(existing.map((item) => [legacyKey(item.key), item]));
      const dismissals = new Set(dismissed.map((item) => legacyKey(item.key)));
      const activeIds = new Set<string>();
      for (const row of rows) {
        const alert = operationAlert(row.entity_name, row.id, row.data, now);
        if (!alert || dismissals.has(alert.reminder_key)) continue;
        const current = currentAlerts.get(alert.reminder_key);
        if (current) {
          activeIds.add(current.id);
          if (current.destination !== alert.destination || current.key !== alert.reminder_key) {
            await tx`UPDATE entity_records SET data = data || ${tx.json({ destination: alert.destination, reminder_key: alert.reminder_key })}
              WHERE id = ${current.id} AND entity_name = 'Notification'`;
          }
          continue;
        }
        await tx`
          INSERT INTO entity_records (id, entity_name, organization_id, data, created_at, updated_at)
          VALUES (${crypto.randomUUID()}, 'Notification', ${row.organization_id}, ${tx.json(alert)}, ${now}, ${now})
        `;
      }
      const staleIds = existing.filter(({ id }) => !activeIds.has(id)).map(({ id }) => id);
      if (staleIds.length) await tx`DELETE FROM entity_records WHERE entity_name = 'Notification' AND id IN ${tx(staleIds)}`;
    });
  } finally { await closeDatabase(sql); }
}
