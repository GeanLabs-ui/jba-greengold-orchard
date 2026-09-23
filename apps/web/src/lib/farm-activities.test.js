import { describe, expect, it } from 'vitest';
import { activities, activityForTask, compareActivitySequence, filterActivities, intersectsRange, overdueActivity, synchronizeActivity } from './farm-activities';

describe('Main Activities operational rules', () => {
  it('filters zero, custom, partial and full completion and combines with status', () => {
    const tasks = [{ id: 'zero', progress_percent: 0 }, { id: 'custom', progress_percent: 63, status: 'in_progress' }, { id: 'done', progress_percent: 100, status: 'completed' }];
    expect(filterActivities(tasks, { completion: '0' }).map((task) => task.id)).toEqual(['zero']);
    expect(filterActivities(tasks, { completion: '63' }).map((task) => task.id)).toEqual(['custom']);
    expect(filterActivities(tasks, { completion: 'partial' }).map((task) => task.id)).toEqual(['custom']);
    expect(filterActivities(tasks, { completion: '100', status: 'completed' }).map((task) => task.id)).toEqual(['done']);
    expect(filterActivities(tasks, { completion: 'partial', status: 'completed' })).toEqual([]);
    expect(filterActivities(tasks, { completion: '' })).toHaveLength(3);
  });
  it('includes all ten activities and preserves readiness qualifications', () => {
    expect(activities).toHaveLength(10);
    expect(activities.map(({ name }) => name)).toEqual([
      'FARM SANITATION',
      'POST-HARVEST PRUNING',
      'NEW VEGETATIVE FLUSH / RECOVERY',
      'POST-HARVEST NUTRITION & ORCHARD MANAGEMENT',
      'PAKLO APPLICATION — VERIFY ACTIVE INGREDIENT',
      'SHOOT MATURATION / REST PERIOD',
      'BEGIN FLOWER INDUCTION',
      'FLOWERING → FRUIT SET → FRUIT DEVELOPMENT & MATURITY',
      'HARVESTING',
      'Management control',
    ]);
    expect(activities[4].timing).toContain('ONLY');
    expect(activities[4].readiness).toContain('not as fertilizer');
    expect(activities[6].timing).toContain('SUBJECT TO tree readiness');
  });
  it('recognizes every workbook heading without changing records and keeps explicit activity assignments', () => {
    for (const activity of activities) {
      const task = Object.freeze({ title: activity.name });
      expect(activityForTask(task)).toBe(activity);
    }
    expect(activityForTask({ title: 'Harvest Completed' })?.id).toBe('review-9');
    expect(activityForTask({ title: 'Harvest Completed', activity_id: 'review-7' })?.id).toBe('review-7');
  });
  it('sorts by workbook sequence then numeric project code while retaining original order for ties', () => {
    const tasks = [
      { id: 'unknown-first', title: 'Custom inspection' },
      { id: 'harvest', title: 'Harvest Completed', project_code: 'A1' },
      { id: 'sanitation-ten', activity_id: 'review-1', project_code: 'A10' },
      { id: 'sanitation-two', activity_id: 'review-1', project_code: 'A2' },
      { id: 'sanitation-two-again', activity_id: 'review-1', project_code: 'A2' },
      { id: 'unknown-second' },
    ];
    expect([...tasks].sort(compareActivitySequence).map(({ id }) => id)).toEqual([
      'sanitation-two', 'sanitation-two-again', 'sanitation-ten', 'harvest', 'unknown-first', 'unknown-second',
    ]);
    expect(compareActivitySequence({}, {})).toBe(0);
    expect(compareActivitySequence({ project_code: null }, { project_code: undefined })).toBe(0);
    expect(compareActivitySequence({ project_code: 2 }, { project_code: 10 })).toBeLessThan(0);
  });
  it('filters intervals that surround the selected range and single-ended ranges', () => {
    const task = { start_date: '2026-01-01', due_date: '2026-12-31' };
    expect(intersectsRange(task, '2026-05-01', '2026-06-01')).toBe(true);
    expect(intersectsRange(task, '2027-01-01', '')).toBe(false);
    expect(intersectsRange(task, '', '2025-12-31')).toBe(false);
    expect(intersectsRange({}, '2026-05-01', '')).toBe(false);
  });
  it('does not mark a task overdue until the day after its end date', () => {
    expect(overdueActivity({ due_date: '2026-09-21', status: 'in_progress' }, '2026-09-21')).toBe(false);
    expect(overdueActivity({ due_date: '2026-09-20', status: 'in_progress' }, '2026-09-21')).toBe(true);
    expect(overdueActivity({ due_date: '2026-09-20', status: 'completed' }, '2026-09-21')).toBe(false);
  });
  it('synchronizes completion and reopens completed work without changing other fields', () => {
    expect(synchronizeActivity({ status: 'not_started' }, { progress_percent: 100 })).toEqual({ status: 'completed', progress_percent: 100 });
    expect(synchronizeActivity({}, { status: 'completed' })).toEqual({ status: 'completed', progress_percent: 100 });
    expect(synchronizeActivity({ status: 'completed', progress_percent: 100 }, { progress_percent: 63 })).toEqual({ status: 'in_progress', progress_percent: 63 });
    expect(synchronizeActivity({ status: 'completed', progress_percent: 100 }, { status: 'on_hold' })).toEqual({ status: 'on_hold', progress_percent: 0 });
    expect(synchronizeActivity({ notes: 'old', status: 'blocked' }, { notes: 'new' })).toEqual({ notes: 'new' });
  });
  it('rejects invalid progress and backwards date ranges', () => {
    for (const progress of [-1, 101, 2.5, 'wrong']) expect(() => synchronizeActivity({}, { progress_percent: progress })).toThrow();
    expect(() => synchronizeActivity({ start_date: '2026-09-21' }, { due_date: '2026-09-20' })).toThrow('End date');
  });
  it('matches My Tasks by identity, never shared names or unassigned records', () => {
    const tasks = [{ id: 'one', owner_id: 'u1' }, { id: 'two', owner_name: 'Same name' }, { id: 'three', owner_user_id: 'u1' }];
    expect(filterActivities(tasks, { tab: 'mine' }, { id: 'u1', full_name: 'Same name' }).map((task) => task.id)).toEqual(['one', 'three']);
    expect(filterActivities(tasks, { tab: 'mine' }, null)).toEqual([]);
  });
  it('searches notes and workbook activity names', () => {
    const tasks = [{ id: 'one', title: 'Orchard Sanitized', notes: 'Block A inspected' }];
    expect(filterActivities(tasks, { search: 'farm sanitation' }, null)).toHaveLength(1);
    expect(filterActivities(tasks, { search: 'block a' }, null)).toHaveLength(1);
    expect(filterActivities(tasks, { search: 'unrelated' }, null)).toHaveLength(0);
  });
});
