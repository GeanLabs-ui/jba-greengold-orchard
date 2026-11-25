import { describe, expect, it } from 'vitest';
import { canAccessWorkspaceEntity, hasWorkspacePage, hasWorkspacePermission, workspacePageDefaults, type WorkspaceUser } from './page-access.js';

describe('delegated workspace access', () => {
  for (const role of Object.keys(workspacePageDefaults) as WorkspaceUser['role'][]) {
    it(`${role} honors explicit production grants and revocation`, () => {
      const user = { role, pageAccess: ['farm_daily_activities'] };
      expect(hasWorkspacePage(user, 'farm_daily_activities')).toBe(true);
      for (const entity of ['FarmBlock', 'DailyActivity', 'Issue', 'FarmProcessLog', 'Equipment']) expect(canAccessWorkspaceEntity(user, entity)).toBe(true);
      expect(canAccessWorkspaceEntity(user, 'Employee')).toBe(false);
      expect(hasWorkspacePermission(user, 'blocks.read')).toBe(true);
      expect(canAccessWorkspaceEntity({ role, pageAccess: [] }, 'FarmBlock')).toBe(false);
      expect(hasWorkspacePermission({ role, pageAccess: [] }, 'blocks.read')).toBe(false);
    });
  }
  it('does not give customers or ordinary users staff access through forged grants', () => {
    for (const role of ['customer','user'] as const) {
      expect(canAccessWorkspaceEntity({role,pageAccess:workspacePageDefaults.admin}, 'FarmBlock')).toBe(false);
      expect(hasWorkspacePermission({role,pageAccess:workspacePageDefaults.admin}, 'farms.read')).toBe(false);
    }
  });
  it('allows source reads but not source writes for dashboard-only or reports-only access', () => {
    expect(canAccessWorkspaceEntity({role:'finance_officer',pageAccess:['dashboard']}, 'FarmBlock')).toBe(true);
    expect(canAccessWorkspaceEntity({role:'finance_officer',pageAccess:['dashboard']}, 'FarmBlock', true)).toBe(false);
    expect(canAccessWorkspaceEntity({role:'finance_officer',pageAccess:['reports']}, 'Expense', true)).toBe(false);
  });
  it('checks approvals against the correct page and retains role restrictions', () => {
    expect(hasWorkspacePermission({role:'finance_officer',pageAccess:['finance']}, 'finance.approve')).toBe(true);
    expect(hasWorkspacePermission({role:'finance_officer',pageAccess:['farms']}, 'finance.approve')).toBe(false);
    expect(hasWorkspacePermission({role:'content_editor',pageAccess:workspacePageDefaults.admin}, 'users.invite')).toBe(false);
  });
});
