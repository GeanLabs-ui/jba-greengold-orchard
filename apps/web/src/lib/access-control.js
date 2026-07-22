export const ADMIN_ACCESS_ROLES = ['super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'inventory_officer', 'quality_officer', 'finance_officer', 'hr_officer', 'sales_officer', 'logistics_officer', 'content_editor', 'auditor'];

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const hasAdminAccess = (user) => (
  ADMIN_ACCESS_ROLES.includes(normalizeRole(user?.role))
);
