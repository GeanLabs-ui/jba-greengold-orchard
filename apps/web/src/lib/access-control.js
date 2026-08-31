export const ADMIN_ACCESS_ROLES = ['super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'inventory_officer', 'quality_officer', 'finance_officer', 'hr_officer', 'sales_officer', 'logistics_officer', 'content_editor', 'auditor'];

export const ADMIN_PAGE_ACCESS = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin', group: 'Overview' },
  { key: 'crm', label: 'CRM', path: '/admin/crm', group: 'Business' },
  { key: 'inquiries', label: 'Client Inquiries', path: '/admin/inquiries', group: 'Business' },
  { key: 'sales', label: 'Sales', path: '/admin/sales', group: 'Business' },
  { key: 'orders', label: 'Orders', path: '/admin/orders', group: 'Business' },
  { key: 'inventory', label: 'Inventory', path: '/admin/inventory', group: 'Business' },
  { key: 'logistics', label: 'Logistics', path: '/admin/logistics', group: 'Business' },
  { key: 'farms', label: 'Farms', path: '/admin/farms', group: 'Production' },
  { key: 'calendar', label: 'Production Calendar', path: '/admin/calendar', group: 'Production' },
  { key: 'farm_daily_activities', label: 'Farm Daily Activities', path: '/admin/farm-daily-activities', group: 'Production' },
  { key: 'procurement', label: 'Procurement', path: '/admin/procurement', group: 'Business' },
  { key: 'finance', label: 'Finance', path: '/admin/finance', group: 'Business' },
  { key: 'export_ops', label: 'Export Operations', path: '/admin/export-ops', group: 'Business' },
  { key: 'hr', label: 'HR', path: '/admin/hr', group: 'System' },
  { key: 'applications', label: 'Applications ATS', path: '/admin/applications', group: 'System' },
  { key: 'content', label: 'Content', path: '/admin/content', group: 'System' },
  { key: 'documents', label: 'Documents', path: '/admin/documents', group: 'System' },
  { key: 'reports', label: 'Reports', path: '/admin/reports', group: 'System' },
  { key: 'system_log', label: 'System Log', path: '/admin/system-log', group: 'System' },
  { key: 'settings', label: 'Settings', path: '/admin/settings', group: 'System' },
];

export const ROLE_PAGE_DEFAULTS = {
  admin: ADMIN_PAGE_ACCESS.map((page) => page.key),
  farm_manager: ['dashboard', 'farms', 'calendar', 'farm_daily_activities', 'inventory', 'procurement'],
  farm_supervisor: ['dashboard', 'farms', 'calendar', 'farm_daily_activities'],
  inventory_officer: ['dashboard', 'inventory', 'procurement'],
  quality_officer: ['dashboard', 'farm_daily_activities', 'documents'],
  finance_officer: ['dashboard', 'finance', 'reports'],
  hr_officer: ['dashboard', 'hr', 'applications'],
  sales_officer: ['dashboard', 'crm', 'inquiries', 'sales', 'orders'],
  logistics_officer: ['dashboard', 'orders', 'logistics', 'export_ops'],
  content_editor: ['dashboard', 'content'],
  auditor: ['dashboard', 'documents', 'reports', 'system_log'],
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const hasAdminAccess = (user) => (
  ADMIN_ACCESS_ROLES.includes(normalizeRole(user?.role))
);

export const pageAccessForUser = (user) => {
  if (normalizeRole(user?.role) === 'super_admin') return ADMIN_PAGE_ACCESS.map((page) => page.key);
  const explicit = user?.pageAccess ?? user?.page_access;
  if (Array.isArray(explicit)) return explicit;
  return ROLE_PAGE_DEFAULTS[normalizeRole(user?.role)] || ['dashboard'];
};

export const adminPageKeyForPath = (pathname) => {
  const normalized = String(pathname || '').split('?')[0].replace(/\/$/, '') || '/admin';
  if (normalized === '/admin') return 'dashboard';
  if (normalized === '/admin/harvests') return 'farm_daily_activities';
  const page = ADMIN_PAGE_ACCESS
    .filter((item) => item.path !== '/admin')
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => normalized === item.path || normalized.startsWith(`${item.path}/`));
  return page?.key || null;
};

export const canAccessAdminPath = (user, pathname) => {
  const key = adminPageKeyForPath(pathname);
  return Boolean(key && pageAccessForUser(user).includes(key));
};

export const defaultAdminPath = (user) => {
  const access = pageAccessForUser(user);
  return ADMIN_PAGE_ACCESS.find((page) => access.includes(page.key))?.path || '/';
};

export const canManageHumanResources = (user) => ['super_admin', 'hr_officer'].includes(normalizeRole(user?.role));
