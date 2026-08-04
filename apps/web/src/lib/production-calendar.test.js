import { describe, expect, it } from 'vitest';
import {
  buildICalendar,
  calendarStatusToTask,
  eventToDailyActivityPayload,
  eventToTaskPayload,
  isReminderDue,
} from './production-calendar';

const event = {
  id: 'event-1',
  task_code: 'CAL-001',
  title: 'Inspect irrigation lines',
  description: 'Check pressure and leaks',
  start_at: '2026-08-05T08:00:00.000Z',
  end_at: '2026-08-05T09:00:00.000Z',
  category: 'Irrigation',
  assigned_to_name: 'Farm team',
  farm_name: 'Eastern Ridge Orchard',
  priority: 'High',
  status: 'scheduled',
  reminder_minutes: 30,
  reminders_enabled: true,
};

describe('production calendar synchronization', () => {
  it('maps calendar events into the shared routine and daily activity records', () => {
    expect(calendarStatusToTask('completed')).toBe('completed');
    expect(eventToTaskPayload(event)).toMatchObject({
      calendar_event_id: 'event-1',
      source: 'Production Calendar',
      phase_name: 'Scheduled Activities',
      planned_start: event.start_at,
    });
    expect(eventToDailyActivityPayload(event)).toMatchObject({
      calendar_event_id: 'event-1',
      activity_date: '2026-08-05',
      start_time: '08:00',
      status: 'Planned',
    });
  });

  it('generates a standards-based calendar feed', () => {
    const output = buildICalendar([event]);
    expect(output).toContain('BEGIN:VCALENDAR');
    expect(output).toContain('SUMMARY:Inspect irrigation lines');
    expect(output).toContain('DTSTART:20260805T080000Z');
    expect(output).toContain('END:VCALENDAR');
  });

  it('only marks an unsent reminder due inside its delivery window', () => {
    expect(isReminderDue(event, new Date('2026-08-05T07:35:00.000Z'))).toBe(true);
    expect(isReminderDue(event, new Date('2026-08-05T07:00:00.000Z'))).toBe(false);
    expect(isReminderDue({ ...event, reminder_sent_for_start: event.start_at }, new Date('2026-08-05T07:35:00.000Z'))).toBe(false);
  });
});
