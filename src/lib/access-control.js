export const ADMIN_ACCESS_ROLES = ['admin', 'staff'];

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const hasAdminAccess = (user) => (
  ADMIN_ACCESS_ROLES.includes(normalizeRole(user?.role))
);
