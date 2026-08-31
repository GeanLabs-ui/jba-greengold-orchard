import { describe, expect, it } from 'vitest';
import { resolveSkeleton } from './skeleton-routes';

const publicRoutes = [
  '/', '/about', '/products', '/cart', '/checkout', '/my-orders', '/farms', '/farms/akyem-orchard',
  '/sustainability', '/export', '/local-supply', '/media', '/news', '/news/harvest-update',
  '/careers', '/contact', '/privacy', '/terms',
];

const portalRoutes = ['/portal', '/portal/orders', '/portal/payments', '/portal/documents'];

const adminRoutes = [
  '/admin', '/admin/crm', '/admin/inquiries', '/admin/sales', '/admin/orders', '/admin/inventory',
  '/admin/calendar', '/admin/logistics', '/admin/procurement', '/admin/finance', '/admin/export-ops',
  '/admin/hr', '/admin/applications', '/admin/content', '/admin/documents', '/admin/reports',
  '/admin/system-log', '/admin/settings', '/admin/farms/farm-1', '/admin/farms/farm-1/blocks/block-1',
];

const farmOperationsRoutes = [
  '/admin/farm-daily-activities/activities/overview', '/admin/farm-daily-activities/activities/records',
  '/admin/farm-daily-activities/activities/create', '/admin/farm-daily-activities/activities/pending',
  '/admin/farm-daily-activities/activities/completed', '/admin/farm-daily-activities/activities/calendar',
  '/admin/farm-daily-activities/activities/approvals', '/admin/farm-daily-activities/activities/master-schedule',
  '/admin/farm-daily-activities/activities/master-schedule/task-1', '/admin/farm-daily-activities/activities/risk-register',
  '/admin/farm-daily-activities/activities/farms', '/admin/farm-daily-activities/harvests/dashboard',
  '/admin/farm-daily-activities/harvests/batches', '/admin/farm-daily-activities/harvests/grading',
  '/admin/farm-daily-activities/harvests/rejected', '/admin/farm-daily-activities/harvests/transfers',
  '/admin/farm-daily-activities/harvests/loading', '/admin/farm-daily-activities/harvests/reports',
  '/admin/farm-daily-activities/harvests/budget-harvest', '/admin/farm-daily-activities/harvests/season-planner',
  '/admin/farm-daily-activities/equipment/overview', '/admin/farm-daily-activities/equipment/usage',
  '/admin/farm-daily-activities/equipment/maintenance', '/admin/farm-daily-activities/equipment/fuel',
  '/admin/farm-daily-activities/equipment/breakdowns', '/admin/farm-daily-activities/equipment/inspections',
  '/admin/farm-daily-activities/reports/daily', '/admin/farm-daily-activities/reports/weekly',
  '/admin/farm-daily-activities/reports/monthly', '/admin/farm-daily-activities/reports/harvest',
  '/admin/farm-daily-activities/reports/labour', '/admin/farm-daily-activities/reports/cost',
  '/admin/farm-daily-activities/reports/export',
];

describe('resolveSkeleton', () => {
  it.each(publicRoutes)('maps public route %s to a named public loader', (path) => {
    const descriptor = resolveSkeleton(path);
    expect(descriptor.area).toBe('public');
    expect(descriptor.label).not.toBe('company story');
  });

  it.each(portalRoutes)('maps portal route %s to a named portal loader', (path) => {
    const descriptor = resolveSkeleton(path);
    expect(descriptor.area).toBe('portal');
    expect(descriptor.template).toMatch(/^portal-/);
  });

  it.each([...adminRoutes, ...farmOperationsRoutes])('maps admin route %s without a generic fallback', (path) => {
    const descriptor = resolveSkeleton(path);
    expect(descriptor.area).toBe('admin');
    expect(descriptor.label).not.toBe('admin page');
  });

  it('keeps farm, block, and analytics loaders structurally distinct', () => {
    expect(resolveSkeleton('/admin/farms/farm-1').template).toBe('profile');
    expect(resolveSkeleton('/admin/farms/farm-1/blocks/block-1').template).toBe('block-profile');
    expect(resolveSkeleton('/admin/farm-daily-activities/activities/overview').template).toBe('analytics');
  });
});
