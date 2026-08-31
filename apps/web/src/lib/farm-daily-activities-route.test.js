import { describe, expect, it } from 'vitest';
import { getFarmDailyActivitiesNavigationState } from './farm-daily-activities-route';

describe('getFarmDailyActivitiesNavigationState', () => {
  it('keeps the compact activity menu available on the daily log', () => {
    const state = getFarmDailyActivitiesNavigationState(
      '/admin/farm-daily-activities/activities/records',
    );

    expect(state.items.map((item) => item.title)).toEqual([
      'Analytics Overview',
      'Daily Activity Log',
      'Main Activities',
      'Risk Register',
      'Farms',
    ]);
    expect(state.activeItem.title).toBe('Daily Activity Log');
  });

  it.each([
    ['/admin/farm-daily-activities/activities/farms/farm-a', 'Farms'],
    ['/admin/farm-daily-activities/activities/farms/farm-a/blocks/a1', 'Farms'],
    ['/admin/farm-daily-activities/activities/master-schedule/task-a', 'Main Activities'],
  ])('selects the parent tab for nested route %s', (pathname, title) => {
    expect(getFarmDailyActivitiesNavigationState(pathname).activeItem.title).toBe(title);
  });
});
