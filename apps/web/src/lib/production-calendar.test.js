import { describe, expect, it } from 'vitest';
import {
  buildICalendar,
  calendarStatusToTask,
  eventToDailyActivityPayload,
  eventToTaskPayload,
  isReminderDue,
  buildFarmCalendarEvents,
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
  it('marks saved tasks on their due dates and reflects updated dates, statuses and descriptions', () => {
    const task = { id: 't1', title: 'Calibrate equipment', due_date: '2026-10-15', planned_start: '2026-10-01', comments: 'Check nozzle pressure', assigned_to_name: 'Spray Lead' };
    const [event] = buildFarmCalendarEvents({ farmTasks: [task] });
    expect(event).toMatchObject({ id: 'task-t1', source_id: 't1', source_entity: 'FarmTask', start_at: '2026-10-15T00:00:00.000Z', end_at: '2026-10-16T00:00:00.000Z', description: 'Check nozzle pressure', status: 'scheduled', all_day: true, reminders_enabled: false });
    const [updated] = buildFarmCalendarEvents({ farmTasks: [{ ...task, due_date: '2026-11-02', status: 'completed', comments: 'Calibration complete' }] });
    expect(updated).toMatchObject({ id: event.id, start_at: '2026-11-02T00:00:00.000Z', status: 'completed', description: 'Calibration complete' });
    expect(buildFarmCalendarEvents({ farmTasks: [{ ...task, archived_at: '2026-10-02' }] })).toEqual([]);
    expect(buildFarmCalendarEvents({ farmTasks: [] })).toEqual([]);
  });
  it('keeps native calendar IDs and does not duplicate their linked farm tasks or logs', () => {
    expect(buildFarmCalendarEvents({ calendarEvents: [event], farmTasks: [{ id: 'task', calendar_event_id: event.id, due_date: '2026-08-05' }], dailyActivities: [{ id: 'log', calendar_event_id: event.id, activity_date: '2026-08-05' }] })).toEqual([event]);
  });
  it('preserves block and combined scopes when synchronizing calendar records', () => {
    for (const scope of [
      { farm_id: 'farm-b', farm_name: 'Farm B', block_id: 'block-b3', block_name: 'B3', block_code: 'B3', shared_scope: '' },
      { farm_id: '', farm_name: 'Farm A&B', block_id: '', block_name: 'Farm A&B', block_code: '', shared_scope: 'Farm A&B' },
    ]) {
      expect(eventToTaskPayload({ ...event, ...scope })).toMatchObject(scope);
      expect(eventToDailyActivityPayload({ ...event, ...scope })).toMatchObject(scope);
    }
  });
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
