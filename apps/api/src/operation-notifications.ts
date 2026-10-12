import { closeDatabase, createDatabase } from './db.js';

const root = '/admin/farm-daily-activities';
const finished = new Set(['completed', 'approved', 'cancelled', 'canceled', 'archived', 'rejected']);

export function operationAlert(entity: string, id: string, data: Record<string, unknown>, now = new Date()) {
  const status = String(data.status || 'pending').toLowerCase().replaceAll('_', ' ');
  if (finished.has(status) || data.archived_at || data.is_archived === true) return null;
  const due = String(data.completion_due_at || data.due_date || data.scheduled_date || '');
  const deadline = due.length === 10 ? `${due}T23:59:59.999Z` : due;
  const delayed = ['delayed', 'blocked', 'overdue'].includes(status) || (Boolean(deadline) && new Date(deadline).getTime() < now.getTime());
  const task = ['FarmProject', 'FarmTask', 'WorkOrder'].includes(entity);
  if (!delayed && !task) return null;
  const parent = String(data.parent_project_id || data.project_id || data.farm_project_id || id);
  const destination = entity === 'FarmTask' && !data.parent_project_id && !data.project_id && !data.farm_project_id
    ? `/admin/calendar?event=${encodeURIComponent(String(data.calendar_event_id || `task-${id}`))}`
    : entity === 'FarmProject' || entity === 'FarmTask'
    ? `${root}/activities/master-schedule/${encodeURIComponent(parent)}`
    : `${root}/activities/records?record=${encodeURIComponent(id)}&entity=${entity}`;
  return {
    title: delayed ? 'Activity delayed' : 'Pending admin task',
    message: `${String(data.title || data.activity_code || data.work_order_code || data.task_code || 'Scheduled activity')}${delayed ? ' needs attention' : ' is awaiting completion'}${due ? ` · Due ${due}` : ''}.`,
    type: delayed ? 'delay' : 'pending_task', notification_type: delayed ? 'delay' : 'pending_task',
    channel: 'Admin', status: 'new', entity_name: entity, record_id: id, destination,
    reminder_key: `${entity}:${id}:${delayed ? `delay:${due}:${status}` : 'pending'}`,
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
      const existing = await tx<{ key: string; destination: string }[]>`SELECT data->>'reminder_key' AS key, data->>'destination' AS destination FROM entity_records WHERE entity_name = 'Notification' AND data ? 'reminder_key'`;
      const dismissed = await tx<{ key: string }[]>`SELECT old_values->>'reminder_key' AS key FROM audit_events WHERE target_table = 'Notification' AND action = 'delete' AND old_values ? 'reminder_key'`;
      const destinations = new Map(existing.map((item) => [item.key, item.destination]));
      const dismissals = new Set(dismissed.map((item) => item.key));
      for (const row of rows) {
        const alert = operationAlert(row.entity_name, row.id, row.data, now);
        if (!alert || dismissals.has(alert.reminder_key)) continue;
        if (destinations.has(alert.reminder_key)) {
          if (destinations.get(alert.reminder_key) !== alert.destination) await tx`UPDATE entity_records SET data = data || ${sql.json({ destination: alert.destination })}
            WHERE entity_name = 'Notification' AND data->>'reminder_key' = ${alert.reminder_key}`;
          continue;
        }
        await tx`
          INSERT INTO entity_records (id, entity_name, organization_id, data, created_at, updated_at)
          SELECT ${crypto.randomUUID()}, 'Notification', ${row.organization_id}, ${sql.json(alert)}, ${now}, ${now}
          WHERE NOT EXISTS (SELECT 1 FROM entity_records WHERE entity_name = 'Notification' AND data->>'reminder_key' = ${alert.reminder_key})
          AND NOT EXISTS (SELECT 1 FROM audit_events WHERE target_table = 'Notification' AND action = 'delete' AND old_values->>'reminder_key' = ${alert.reminder_key})
        `;
      }
    });
  } finally { await closeDatabase(sql); }
}
