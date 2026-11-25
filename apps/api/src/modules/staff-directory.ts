import type { Database } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';
import type postgres from 'postgres';
import { isWorkspaceStaff } from 'mango-farm-authorization';

export async function syncStaffDisplayName(tx: postgres.TransactionSql, user: AuthUser, fullName: string) {
  if (!isWorkspaceStaff(user)) return;
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  await tx`UPDATE entity_records SET data = data || ${tx.json({ full_name: fullName, first_name: firstName, last_name: rest.join(' ') })}, updated_at = now()
    WHERE entity_name = 'Employee' AND organization_id IS NOT DISTINCT FROM ${user.organizationId}
      AND (data->>'user_id' = ${user.id} OR lower(data->>'email') = ${user.email.toLowerCase()})`;
}

export type StaffIdentity = { id: string; email: string; full_name: string | null; status: string; role?: string };
export function staffTotals(employees: { data: Record<string, unknown> }[], accounts: StaffIdentity[]) {
  const linked = new Set<string>(); let active = 0;
  for (const { data } of employees) {
    const account = accounts.find(a => a.id === data.user_id || a.email.toLowerCase() === String(data.email || '').trim().toLowerCase());
    if (account) { if (linked.has(account.id)) continue; linked.add(account.id); }
    if (String(account?.status ?? data.status ?? 'active').toLowerCase() === 'active') active++;
  }
  const unlinked = accounts.filter(a => !linked.has(a.id));
  const uniqueEmployees = employees.filter(({ data }, index) => !employees.slice(0, index).some(({ data: previous }) => {
    const account = accounts.find(a => a.id === data.user_id || a.email.toLowerCase() === String(data.email || '').trim().toLowerCase());
    return account && (previous.user_id === account.id || String(previous.email || '').toLowerCase() === account.email.toLowerCase());
  }));
  return { total: uniqueEmployees.length + unlinked.length, active: active + unlinked.filter(a => a.status === 'active').length };
}

export async function readStaffAccounts(sql: Database, user: AuthUser): Promise<StaffIdentity[]> {
  return sql<StaffIdentity[]>`SELECT u.id, u.email, u.full_name, u.status, u.role FROM users u
    WHERE u.role NOT IN ('customer','user') AND (
      ${user.role === 'super_admin'} OR EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id AND om.organization_id IS NOT DISTINCT FROM ${user.organizationId})
      OR (NOT EXISTS (SELECT 1 FROM organization_members direct WHERE direct.user_id=u.id)
        AND EXISTS (SELECT 1 FROM staff_invitations i JOIN organization_members inviter ON inviter.user_id=i.invited_by
          WHERE lower(i.email)=lower(u.email) AND i.accepted_at IS NOT NULL AND inviter.organization_id=${user.organizationId})
        AND (SELECT count(DISTINCT inviter.organization_id) FROM staff_invitations i JOIN organization_members inviter ON inviter.user_id=i.invited_by
          WHERE lower(i.email)=lower(u.email) AND i.accepted_at IS NOT NULL)=1)
      OR (${user.organizationId}::text IS NULL AND NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id)))`;
}

export async function hydrateEmployeeNames(sql: Database, user: AuthUser, rows: { data: unknown }[]) {
  if (!rows.length) return;
  const accounts = await readStaffAccounts(sql, user);
  for (const row of rows) {
    const data = row.data as Record<string, unknown>;
    const account = accounts.find(a => a.id === data.user_id || a.email.toLowerCase() === String(data.email || '').trim().toLowerCase());
    if (account?.full_name) {
      const [first_name, ...rest] = account.full_name.split(/\s+/);
      row.data = { ...data, full_name: account.full_name, first_name, last_name: rest.join(' ') };
    }
  }
}

export async function syncEmployeeAccountName(tx: postgres.TransactionSql, data: Record<string, unknown>, organizationId: string | null) {
  if (typeof data.full_name !== 'string' || !data.full_name.trim() || !data.email) return;
  await tx`UPDATE users u SET full_name=${data.full_name.trim()},updated_at=now()
    WHERE lower(u.email)=lower(${String(data.email)}) AND u.role NOT IN ('customer','user')
      AND (${typeof data.user_id === 'string' ? data.user_id : null}::text IS NULL OR u.id=${typeof data.user_id === 'string' ? data.user_id : null})
      AND (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id AND om.organization_id IS NOT DISTINCT FROM ${organizationId})
        OR (${organizationId}::text IS NULL AND NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id)))`;
}
