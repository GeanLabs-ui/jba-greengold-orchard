import { farmDailyActivitiesNavigation } from './farm-navigation';

const hiddenActivityBarItems = new Set([
  'Create Activity',
  'Pending Activities',
  'Completed Activities',
  'Activity Calendar',
  'Approvals',
]);

const routeMatches = (pathname, route) => (
  pathname === route || pathname.startsWith(`${route}/`)
);

export function getFarmDailyActivitiesNavigationState(pathname) {
  const section = farmDailyActivitiesNavigation.find(({ path }) => routeMatches(pathname, path))
    || farmDailyActivitiesNavigation[0];
  const items = section.path === '/admin/farm-daily-activities/activities'
    ? section.children.filter((child) => !hiddenActivityBarItems.has(child.title))
    : section.children;
  const activeItem = [...items]
    .sort((left, right) => right.path.length - left.path.length)
    .find((child) => routeMatches(pathname, child.path))
    || items[0];

  return { section, items, activeItem };
}
