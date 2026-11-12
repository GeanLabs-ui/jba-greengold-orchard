import { describe, expect, it } from 'vitest';
import { operationAlert } from './operation-notifications.js';

describe('operation notifications', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  it('omits pending subtasks and links delayed subtasks to their exact checklist row', () => {
    const subtask = { parent_project_id: 'parent', title: 'Irrigation', due_date: '2026-10-02' };
    expect(operationAlert('FarmTask', 'sub', subtask, now)).toBeNull();
    expect(operationAlert('FarmTask', 'sub', { ...subtask, due_date: '2026-09-30' }, now)).toMatchObject({
      type: 'delay', destination: '/admin/farm-daily-activities/activities/master-schedule/parent?subtask=sub', record_id: 'sub',
    });
  });
  it('does not declare a date-only deadline late before the day ends', () => {
    expect(operationAlert('DailyActivity', 'a', { due_date: '2026-10-01' }, now)).toBeNull();
  });
  it('links standalone tasks to their record even if they have no calendar date', () => {
    expect(operationAlert('FarmTask', 'standalone', { status: 'blocked' }, now)?.destination).toBe('/admin/farm-daily-activities/activities/records?record=standalone&entity=FarmTask');
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
    expect(operationAlert('FarmTask', 'a', { due_date: '2026-09-29', status: 'blocked' }, now)?.reminder_key).toBe(first?.reminder_key);
    expect(operationAlert('FarmTask', 'a', { due_date: '2026-09-30' }, now)?.reminder_key).not.toBe(first?.reminder_key);
  });
});
