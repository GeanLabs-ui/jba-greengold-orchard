import { closeDatabase, createDatabase } from './db.js';

type CalendarRow = {
  id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  data: Record<string, unknown>;
};

export async function runCalendarReminders(env: Env, now = new Date()): Promise<number> {
  const sql = createDatabase(env);
  let delivered = 0;
  try {
    const rows = await sql<CalendarRow[]>`
      SELECT id, organization_id, owner_user_id, data
      FROM entity_records
      WHERE entity_name = 'CalendarEvent'
        AND COALESCE(data->>'reminders_enabled', 'false') = 'true'
        AND COALESCE(data->>'status', 'scheduled') NOT IN ('completed', 'cancelled')
      ORDER BY data->>'start_at' ASC
      LIMIT 1000
    `;
    for (const row of rows) {
      const startAt = String(row.data.start_at || '');
      const start = new Date(startAt).getTime();
      if (!Number.isFinite(start) || row.data.reminder_sent_for_start === startAt) continue;
      const reminderMinutes = Math.max(0, Number(row.data.reminder_minutes || 0));
      const dueAt = start - reminderMinutes * 60_000;
      if (now.getTime() < dueAt || now.getTime() > start + 30 * 60_000) continue;
      const notificationId = crypto.randomUUID();
      const notification = {
        title: 'Production activity reminder',
        message: `${String(row.data.title || 'Scheduled activity')} is ${reminderMinutes ? `due in ${reminderMinutes} minutes` : 'due now'}.`,
        type: 'calendar_activity',
        notification_type: 'calendar_activity',
        channel: 'Admin',
        status: 'new',
        calendar_event_id: row.id,
        record_id: row.id,
        entity_name: 'CalendarEvent',
        destination: `/admin/calendar?event=${row.id}`,
        reminder_key: `${row.id}:${startAt}`,
      };
      await sql.begin(async (transaction) => {
        await transaction`
          INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by, created_at, updated_at)
          VALUES (${notificationId}, 'Notification', ${row.organization_id}, ${row.owner_user_id}, ${sql.json(notification)}, ${row.owner_user_id}, ${row.owner_user_id}, ${now}, ${now})
        `;
        await transaction`
          UPDATE entity_records
          SET data = data || ${sql.json({ reminder_sent_at: now.toISOString(), reminder_sent_for_start: startAt })}, updated_at = ${now}
          WHERE id = ${row.id} AND entity_name = 'CalendarEvent'
        `;
      });
      delivered += 1;
    }
    return delivered;
  } finally {
    await closeDatabase(sql);
  }
}

