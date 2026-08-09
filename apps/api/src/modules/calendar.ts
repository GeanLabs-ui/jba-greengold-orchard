import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();

type StoredRecord = {
  id: string;
  organization_id: string | null;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

const escapeIcs = (value: unknown) => String(value || '')
  .replaceAll('\\', '\\\\')
  .replaceAll('\n', '\\n')
  .replaceAll(',', '\\,')
  .replaceAll(';', '\\;');

const dateKey = (value: unknown) => String(value || '').slice(0, 10);
const icsDate = (value: unknown, allDay = false) => {
  if (allDay) return dateKey(value).replaceAll('-', '');
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
};

function buildFeed(events: StoredRecord[], name: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JBA GreenGold Orchard//Production Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(name)}`,
    'X-WR-TIMEZONE:Africa/Accra',
  ];
  events.forEach((row) => {
    const event = row.data;
    if (!event.start_at) return;
    const allDay = Boolean(event.all_day);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(row.id)}@jbagreengoldorchard.farm`,
      `DTSTAMP:${icsDate(row.updated_at)}`,
      allDay ? `DTSTART;VALUE=DATE:${icsDate(event.start_at, true)}` : `DTSTART:${icsDate(event.start_at)}`,
      allDay ? `DTEND;VALUE=DATE:${icsDate(event.end_at || event.start_at, true)}` : `DTEND:${icsDate(event.end_at || event.start_at)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.description || event.notes)}`,
      `LOCATION:${escapeIcs(event.farm_name)}`,
      `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : event.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

router.get('/feed/:token', async (c) => {
  const token = c.req.param('token');
  if (!/^[a-f0-9]{24,64}$/i.test(token)) return c.text('Calendar feed not found', 404);
  const sql = createDatabase(c.env);
  try {
    const connections = await sql<StoredRecord[]>`
      SELECT id, organization_id, data, created_at, updated_at
      FROM entity_records
      WHERE entity_name = 'CalendarConnection'
        AND data->>'feed_token' = ${token}
        AND COALESCE(data->>'status', 'connected') = 'connected'
      LIMIT 1
    `;
    const connection = connections[0];
    if (!connection) return c.text('Calendar feed not found', 404);
    const events = await sql<StoredRecord[]>`
      SELECT id, organization_id, data, created_at, updated_at
      FROM entity_records
      WHERE entity_name = 'CalendarEvent'
        AND organization_id IS NOT DISTINCT FROM ${connection.organization_id}
      ORDER BY data->>'start_at' ASC
      LIMIT 1000
    `;
    c.header('Content-Type', 'text/calendar; charset=utf-8');
    c.header('Content-Disposition', 'inline; filename="jba-production-calendar.ics"');
    c.header('Cache-Control', 'private, max-age=300');
    return c.body(buildFeed(events, String(connection.data.calendar_name || 'JBA GreenGold Production')));
  } finally {
    await closeDatabase(sql);
  }
});

export default router;
