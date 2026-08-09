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

  it('restricts block merging to admins while letting farm staff manage blocks day-to-day', () => {
    expect(hasPermission('admin', 'blocks.merge')).toBe(true);
    expect(hasPermission('super_admin', 'blocks.merge')).toBe(true);
    expect(hasPermission('farm_manager', 'blocks.merge')).toBe(false);
    expect(hasPermission('farm_supervisor', 'blocks.merge')).toBe(false);
    expect(hasPermission('farm_manager', 'blocks.create')).toBe(true);
    expect(hasPermission('farm_manager', 'blocks.deactivate')).toBe(true);
    expect(hasPermission('farm_supervisor', 'blocks.create')).toBe(true);
    expect(hasPermission('farm_supervisor', 'blocks.deactivate')).toBe(false);
  });

  it('lets auditors read farm operations data without granting write access', () => {
    expect(hasPermission('auditor', 'blocks.read')).toBe(true);
    expect(hasPermission('auditor', 'harvest_periods.read')).toBe(true);
    expect(hasPermission('auditor', 'activity_periods.read')).toBe(true);
    expect(hasPermission('auditor', 'blocks.create')).toBe(false);
  });

  it('keeps unrelated roles (inventory, sales) away from block/harvest-period permissions', () => {
    expect(hasPermission('inventory_officer', 'blocks.read')).toBe(false);
    expect(hasPermission('sales_officer', 'blocks.merge')).toBe(false);
  });
});
