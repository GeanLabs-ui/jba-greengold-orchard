import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions.js';

describe('role permissions', () => {
  it('grants super administrators every declared permission', () => {
    expect(hasPermission('super_admin', 'roles.assign')).toBe(true);
    expect(hasPermission('super_admin', 'finance.approve')).toBe(true);
  });

  it('keeps customers and auditors from changing business records', () => {
    expect(hasPermission('customer', 'farms.update')).toBe(false);
    expect(hasPermission('auditor', 'finance.create')).toBe(false);
    expect(hasPermission('auditor', 'finance.read')).toBe(true);
  });
});
