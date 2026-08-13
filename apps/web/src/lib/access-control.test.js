import { describe, expect, it } from 'vitest';
import {
  adminPageKeyForPath,
  canAccessAdminPath,
  pageAccessForUser,
} from './access-control';

describe('admin page access', () => {
  it('uses explicit switches and blocks a disabled page including its subpages', () => {
    const user = { role: 'admin', pageAccess: ['dashboard', 'hr'] };
    expect(canAccessAdminPath(user, '/admin/hr')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/hr/employee/123')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/finance')).toBe(false);
  });

  it('maps Farm Daily Activities and its subpages to one access switch', () => {
    expect(adminPageKeyForPath('/admin/farm-daily-activities/reports')).toBe('farm_daily_activities');
    expect(adminPageKeyForPath('/admin/harvests')).toBe('farm_daily_activities');
  });

  it('uses role defaults before HR assigns an explicit list', () => {
    expect(pageAccessForUser({ role: 'hr_officer' })).toEqual(['dashboard', 'hr', 'applications']);
  });

  it('never restricts the super administrator', () => {
    expect(canAccessAdminPath({ role: 'super_admin', pageAccess: [] }, '/admin/settings')).toBe(true);
  });
});
