import { describe, expect, it } from 'vitest';
import { calendarReminder, scheduledCalendarAlert } from './calendar-reminders.js';

const event = {
  title: 'Irrigation check', status: 'scheduled', start_at: '2026-11-12T12:30:00Z',
  end_at: '2026-11-12T13:30:00Z', reminders_enabled: true, reminder_minutes: 15,
};

describe('calendar notifications', () => {
  it('creates a scheduled alert that links to the exact event', () => {
    expect(scheduledCalendarAlert('event 1', event)).toMatchObject({
      type: 'calendar_scheduled', record_id: 'event 1', destination: '/admin/calendar?event=event%201',
    });
  });

  it('starts reminding at the configured lead time and allows an hourly cron to catch a due event', () => {
    expect(calendarReminder('event', event, new Date('2026-11-12T12:14:59Z'))).toBeNull();
    expect(calendarReminder('event', event, new Date('2026-11-12T12:15:00Z'))?.type).toBe('calendar_due');
    expect(calendarReminder('event', event, new Date('2026-11-12T13:00:00Z'))?.reminder_key).toBe(`event:${event.start_at}`);
    expect(calendarReminder('event', event, new Date('2026-11-12T14:00:00Z'))).toBeNull();
  });

  it('omits finished, disabled, and previously sent reminders', () => {
    const now = new Date(event.start_at);
    expect(calendarReminder('event', { ...event, status: 'completed' }, now)).toBeNull();
    expect(calendarReminder('event', { ...event, reminders_enabled: false }, now)).toBeNull();
    expect(calendarReminder('event', { ...event, reminder_sent_for_start: event.start_at }, now)).toBeNull();
  });
});
