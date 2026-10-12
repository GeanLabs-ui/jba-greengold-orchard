import { describe, expect, it } from 'vitest';
import { getFarmDailyActivitiesNavigationState } from './farm-daily-activities-route';

describe('getFarmDailyActivitiesNavigationState', () => {
  const expectedActivityMenu = [
      'Analytics Overview',
      'Daily Task Log',
      'Main Activities',
      'Rist and Issue report',
      'Farm Ops',
  ];

  it.each([
    ['/admin/farm-daily-activities/activities/', 'Analytics Overview'],
    ['/admin/farm-daily-activities/activities/overview', 'Analytics Overview'],
    ['/admin/farm-daily-activities/activities/records', 'Daily Task Log'],
    ['/admin/farm-daily-activities/activities/master-schedule', 'Main Activities'],
    ['/admin/farm-daily-activities/activities/risk-register', 'Rist and Issue report'],
    ['/admin/farm-daily-activities/activities/issues', 'Rist and Issue report'],
    ['/admin/farm-daily-activities/activities/farms', 'Farm Ops'],
    ['/admin/farm-daily-activities/activities/harvest', 'Farm Ops'],
    ['/admin/farm-daily-activities/activities/tools-equipment', 'Farm Ops'],
  ])('keeps the complete activity menu on %s', (pathname, activeTitle) => {
    const state = getFarmDailyActivitiesNavigationState(pathname);

    expect(state.items.map((item) => item.title)).toEqual(expectedActivityMenu);
    expect(state.activeItem.title).toBe(activeTitle);
  });

  it.each([
    ['/admin/farm-daily-activities/activities/farms/farm-a', 'Farm Ops'],
    ['/admin/farm-daily-activities/activities/farms/farm-a/blocks/a1', 'Farm Ops'],
    ['/admin/farm-daily-activities/activities/master-schedule/task-a', 'Main Activities'],
  ])('selects the parent tab for nested route %s', (pathname, title) => {
    expect(getFarmDailyActivitiesNavigationState(pathname).activeItem.title).toBe(title);
  });
});
