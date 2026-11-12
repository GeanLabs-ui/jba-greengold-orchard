import { closeDatabase, createDatabase } from './db.js';
import type { JSONValue } from 'postgres';

type CalendarRow = {
  id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  data: Record<string, JSONValue>;
};

const calendarTime = new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' });
const finishedStatuses = new Set(['completed', 'cancelled', 'canceled', 'archived']);

function activeEventStart(event: Record<string, unknown>) {
  if (finishedStatuses.has(String(event.status || '').trim().toLowerCase()) || event.archived_at || Number(event.progress_percent) >= 100) return NaN;
  return Date.parse(String(event.start_at || ''));
}

function calendarAlert(id: string, type: 'calendar_scheduled' | 'calendar_due', title: string, message: string) {
  return {
    title, message, type, notification_type: type, channel: 'Admin', status: 'new',
    calendar_event_id: id, record_id: id, entity_name: 'CalendarEvent',
    destination: `/admin/calendar?event=${encodeURIComponent(id)}`,
  };
}

export function scheduledCalendarAlert(id: string, event: Record<string, unknown>) {
  const start = activeEventStart(event);
  if (!Number.isFinite(start)) return null;
  return calendarAlert(id, 'calendar_scheduled', 'Calendar activity scheduled', `${String(event.title || 'Calendar activity')} · ${calendarTime.format(start)}`);
}

export function calendarReminder(id: string, event: Record<string, unknown>, now: Date) {
  const startAt = String(event.start_at || '');
  const start = activeEventStart(event);
  if (event.reminders_enabled !== true && event.reminders_enabled !== 'true') return null;
  if (!Number.isFinite(start) || event.reminder_sent_for_start === startAt) return null;
  const minutes = Number(event.reminder_minutes || 0);
  const due = start - (Number.isFinite(minutes) ? Math.max(0, minutes) : 0) * 60_000;
  const end = Date.parse(String(event.end_at || ''));
  // Allow one hourly scheduler interval after the start, or until a longer event ends.
  if (now.getTime() < due || now.getTime() > Math.max(start + 60 * 60_000, Number.isFinite(end) ? end : start)) return null;
  const timing = now.getTime() < start ? 'starts at' : now.getTime() === start ? 'is due at' : 'was set for';
  return {
    ...calendarAlert(id, 'calendar_due', 'Calendar activity due', `${String(event.title || 'Calendar activity')} ${timing} ${calendarTime.format(start)}.`),
    reminder_key: `${id}:${startAt}`,
  };
}

export async function runCalendarReminders(env: Env, now = new Date()): Promise<number> {
  const sql = createDatabase(env);
  let delivered = 0;
  try {
    const rows = await sql<CalendarRow[]>`
      SELECT id, organization_id, owner_user_id, data
      FROM entity_records
      WHERE entity_name = 'CalendarEvent'
        AND COALESCE(data->>'reminders_enabled', 'false') = 'true'
        AND COALESCE(lower(data->>'status'), 'scheduled') NOT IN ('completed', 'cancelled', 'canceled')
        AND (data->>'reminder_sent_for_start') IS DISTINCT FROM (data->>'start_at')
    `;
    for (const row of rows) {
      const notification = calendarReminder(row.id, row.data, now);
      if (!notification) continue;
      delivered += await sql.begin(async (transaction) => {
        const claimed = await transaction`
          UPDATE entity_records
          SET data = data || ${sql.json({ reminder_sent_at: now.toISOString(), reminder_sent_for_start: String(row.data.start_at) })}, updated_at = ${now}
          WHERE id = ${row.id} AND entity_name = 'CalendarEvent' AND data = ${transaction.json(row.data)}
          RETURNING id
        `;
        if (!claimed.length) return 0;
        const inserted = await transaction`
          INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by, created_at, updated_at)
          SELECT ${crypto.randomUUID()}, 'Notification', ${row.organization_id}, ${row.owner_user_id}, ${sql.json(notification)}, ${row.owner_user_id}, ${row.owner_user_id}, ${now}, ${now}
          WHERE NOT EXISTS (SELECT 1 FROM entity_records WHERE entity_name = 'Notification' AND data->>'reminder_key' = ${notification.reminder_key})
          AND NOT EXISTS (SELECT 1 FROM audit_events WHERE target_table = 'Notification' AND action = 'delete' AND old_values->>'reminder_key' = ${notification.reminder_key})
          RETURNING id
        `;
        return inserted.length;
      });
    }
    return delivered;
  } finally {
    await closeDatabase(sql);
  }
}
