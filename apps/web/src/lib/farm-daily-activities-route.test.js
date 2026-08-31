import { describe, expect, it } from 'vitest';
import { getFarmDailyActivitiesNavigationState } from './farm-daily-activities-route';

describe('getFarmDailyActivitiesNavigationState', () => {
  const expectedActivityMenu = [
      'Analytics Overview',
      'Daily Activity Log',
      'Main Activities',
      'Risk Register',
      'Farms',
  ];

  it.each([
    ['/admin/farm-daily-activities/activities/', 'Analytics Overview'],
    ['/admin/farm-daily-activities/activities/overview', 'Analytics Overview'],
    ['/admin/farm-daily-activities/activities/records', 'Daily Activity Log'],
    ['/admin/farm-daily-activities/activities/master-schedule', 'Main Activities'],
    ['/admin/farm-daily-activities/activities/risk-register', 'Risk Register'],
    ['/admin/farm-daily-activities/activities/farms', 'Farms'],
  ])('keeps the complete activity menu on %s', (pathname, activeTitle) => {
    const state = getFarmDailyActivitiesNavigationState(pathname);

    expect(state.items.map((item) => item.title)).toEqual(expectedActivityMenu);
    expect(state.activeItem.title).toBe(activeTitle);
  });

  it.each([
    ['/admin/farm-daily-activities/activities/farms/farm-a', 'Farms'],
    ['/admin/farm-daily-activities/activities/farms/farm-a/blocks/a1', 'Farms'],
    ['/admin/farm-daily-activities/activities/master-schedule/task-a', 'Main Activities'],
  ])('selects the parent tab for nested route %s', (pathname, title) => {
    expect(getFarmDailyActivitiesNavigationState(pathname).activeItem.title).toBe(title);
  });
});
