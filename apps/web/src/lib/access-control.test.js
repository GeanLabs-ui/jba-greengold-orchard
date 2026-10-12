import { describe, expect, it } from 'vitest';
import {
  adminPageKeyForPath,
  canAccessAdminPath,
  pageAccessForUser,
} from './access-control';

describe('admin page access', () => {
  it('retains separate permissions inside the grouped business pages', () => {
    const user = { role: 'logistics_officer' };
    expect(canAccessAdminPath(user, '/admin/marketing')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/marketing/orders')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/marketing/sales')).toBe(false);
    expect(canAccessAdminPath(user, '/admin/client-management')).toBe(false);
    expect(canAccessAdminPath({ role: 'admin', pageAccess: ['inquiries'] }, '/admin/client-management')).toBe(true);
    expect(adminPageKeyForPath('/admin/client-management/crm/account-reviews')).toBe('crm');
    expect(adminPageKeyForPath('/admin/client-management/inquiries')).toBe('inquiries');
    expect(canAccessAdminPath(user, '/admin/orders')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/marketing/content')).toBe(false);
    const editor = { role: 'content_editor' };
    expect(canAccessAdminPath(editor, '/admin/marketing')).toBe(true);
    expect(canAccessAdminPath(editor, '/admin/marketing/content')).toBe(true);
    expect(canAccessAdminPath(editor, '/admin/marketing/products')).toBe(true);
    expect(canAccessAdminPath(editor, '/admin/marketing/news-posts')).toBe(true);
    expect(canAccessAdminPath(user, '/admin/marketing/products')).toBe(false);
    expect(canAccessAdminPath(user, '/admin/marketing/news-posts')).toBe(false);
    expect(canAccessAdminPath(editor, '/admin/content')).toBe(true);
    expect(canAccessAdminPath(editor, '/admin/marketing/sales')).toBe(false);
  });

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
