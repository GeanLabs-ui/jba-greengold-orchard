import { describe, expect, it } from 'vitest';
import { operationAlert } from './operation-notifications.js';

describe('operation notifications', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  it('links pending subtasks to their parent task', () => {
    expect(operationAlert('FarmTask', 'sub', { parent_project_id: 'parent', title: 'Irrigation', due_date: '2026-10-02' }, now)).toMatchObject({
      type: 'pending_task', destination: '/admin/farm-daily-activities/activities/master-schedule/parent', record_id: 'sub',
    });
  });
  it('does not declare a date-only deadline late before the day ends', () => {
    expect(operationAlert('DailyActivity', 'a', { due_date: '2026-10-01' }, now)).toBeNull();
  });
  it('links standalone tasks to their calendar source', () => {
    expect(operationAlert('FarmTask', 'standalone', { due_date: '2026-09-30' }, now)?.destination).toBe('/admin/calendar?event=task-standalone');
  });
  it('detects missed deadlines and blocked activities', () => {
    expect(operationAlert('DailyActivity', 'a', { due_date: '2026-09-30' }, now)?.type).toBe('delay');
    expect(operationAlert('FarmTask', 'a', { status: 'blocked' }, now)?.type).toBe('delay');
  });
  it('skips finished and archived records', () => {
    for (const status of ['Completed', 'Approved', 'Cancelled', 'archived']) expect(operationAlert('FarmTask', 'a', { status, due_date: '2020-01-01' }, now)).toBeNull();
    expect(operationAlert('FarmTask', 'a', { archived_at: now.toISOString() }, now)).toBeNull();
  });
  it('uses a stable dismissal key but changes it for a rescheduled deadline', () => {
    const first = operationAlert('FarmTask', 'a', { due_date: '2026-09-29' }, now);
    expect(operationAlert('FarmTask', 'a', { due_date: '2026-09-29' }, now)?.reminder_key).toBe(first?.reminder_key);
    expect(operationAlert('FarmTask', 'a', { due_date: '2026-09-30' }, now)?.reminder_key).not.toBe(first?.reminder_key);
  });
});
