export function resolveSkeleton(pathname = '/') {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/accept-staff-invite'].includes(path)) return { area: 'auth', template: 'auth', label: 'account access' };
  if (path === '/portal') return { area: 'portal', template: 'portal-dashboard', label: 'customer dashboard' };
  if (path === '/portal/orders') return { area: 'portal', template: 'portal-orders', label: 'customer orders' };
  if (path === '/portal/payments') return { area: 'portal', template: 'portal-payments', label: 'payments and invoices' };
  if (path === '/portal/documents') return { area: 'portal', template: 'portal-documents', label: 'customer documents' };
  if (path.startsWith('/admin')) {
    if (path === '/admin') return { area: 'admin', template: 'dashboard', label: 'admin dashboard' };
    if (/\/farms\/[^/]+\/blocks\/[^/]+$/.test(path)) return { area: 'admin', template: 'block-profile', label: 'farm block profile' };
    if (/\/farms\/[^/]+$/.test(path)) return { area: 'admin', template: 'profile', label: 'farm profile' };
    if (/master-schedule\/[^/]+$/.test(path)) return { area: 'admin', template: 'task', label: 'master schedule task' };
    if (path.includes('/activities/overview') || path === '/admin/farm-daily-activities') return { area: 'admin', template: 'analytics', label: 'farm operations analytics' };
    if (path.includes('/activities/create')) return { area: 'admin', template: 'form', label: 'new farm activity' };
    if (path.includes('/activities/calendar') || path.includes('/equipment/maintenance')) return { area: 'admin', template: 'calendar', label: 'operations calendar' };
    if (path.includes('/activities/master-schedule')) return { area: 'admin', template: 'schedule', label: 'master schedule' };
    if (path.includes('/activities/risk-register')) return { area: 'admin', template: 'risk', label: 'farm risk register' };
    if (path.includes('/activities/farms')) return { area: 'admin', template: 'directory', label: 'farm directory' };
    if (path.includes('/activities/approvals')) return { area: 'admin', template: 'approvals', label: 'activity approvals' };
    if (path.includes('/activities/')) {
      const activityLabel = path.endsWith('/pending') ? 'pending farm activities' : path.endsWith('/completed') ? 'completed farm activities' : 'daily activity log';
      return { area: 'admin', template: 'activity-log', label: activityLabel };
    }
    if (path.includes('/harvests/season-planner')) return { area: 'admin', template: 'calendar', label: 'harvest season planner' };
    if (path.includes('/harvests/budget-harvest')) return { area: 'admin', template: 'budget', label: 'budget and harvest' };
    if (path.includes('/harvests/transfers') || path.includes('/harvests/loading')) return { area: 'admin', template: 'logistics-board', label: path.includes('/loading') ? 'truck loading' : 'warehouse transfers' };
    if (path.includes('/harvests/dashboard')) return { area: 'admin', template: 'harvest', label: 'harvest dashboard' };
    if (path.includes('/harvests/')) return { area: 'admin', template: 'harvest-log', label: path.endsWith('/grading') ? 'harvest grading' : path.endsWith('/rejected') ? 'rejected fruit' : 'harvest records' };
    if (path.includes('/equipment/overview') || path.includes('/equipment/inspections')) return { area: 'admin', template: 'equipment', label: path.endsWith('/inspections') ? 'equipment inspections' : 'equipment overview' };
    if (path.includes('/equipment/')) return { area: 'admin', template: 'equipment-log', label: path.endsWith('/fuel') ? 'fuel usage' : path.endsWith('/breakdowns') ? 'equipment breakdowns' : 'equipment usage' };
    if (path.includes('/reports/daily')) return { area: 'admin', template: 'reports', label: 'daily reports dashboard' };
    if (path.includes('/reports/')) return { area: 'admin', template: 'report-table', label: path.endsWith('/weekly') ? 'weekly farm reports' : path.endsWith('/monthly') ? 'monthly farm reports' : 'farm reports' };
    const adminRoutes = {
      '/admin/crm': ['directory', 'customer relationships'], '/admin/inquiries': ['table', 'client inquiries'], '/admin/sales': ['table', 'sales workspace'], '/admin/orders': ['table', 'order management'],
      '/admin/inventory': ['table', 'inventory'], '/admin/calendar': ['calendar', 'production calendar'], '/admin/logistics': ['table', 'logistics'], '/admin/procurement': ['table', 'procurement'],
      '/admin/finance': ['finance', 'finance'], '/admin/export-ops': ['table', 'export operations'], '/admin/hr': ['directory', 'human resources'], '/admin/applications': ['applications', 'job applications'],
      '/admin/content': ['documents', 'website content'], '/admin/documents': ['documents', 'admin documents'], '/admin/reports': ['reports', 'business reports'], '/admin/system-log': ['table', 'system log'],
      '/admin/settings': ['settings', 'admin settings'],
    };
    const match = adminRoutes[path] || ['table', 'admin page'];
    return { area: 'admin', template: match[0], label: match[1] };
  }
  if (path === '/') return { area: 'public', template: 'home', label: 'home page' };
  if (path === '/products') return { area: 'public', template: 'catalog', label: 'product catalogue' };
  if (path === '/cart') return { area: 'public', template: 'cart', label: 'shopping cart' };
  if (path === '/checkout') return { area: 'public', template: 'checkout', label: 'checkout' };
  if (path === '/my-orders') return { area: 'public', template: 'orders', label: 'order tracking' };
  if (path === '/farms') return { area: 'public', template: 'farms', label: 'farms page' };
  if (path.startsWith('/farms/')) return { area: 'public', template: 'farm-detail', label: 'farm details' };
  if (path === '/export') return { area: 'public', template: 'export', label: 'export services' };
  if (path === '/news') return { area: 'public', template: 'news', label: 'news' };
  if (path.startsWith('/news/')) return { area: 'public', template: 'article', label: 'news article' };
  if (path === '/media') return { area: 'public', template: 'media', label: 'media gallery' };
  if (path === '/careers') return { area: 'public', template: 'careers', label: 'careers' };
  if (path === '/contact') return { area: 'public', template: 'contact', label: 'contact page' };
  if (path === '/privacy' || path === '/terms') return { area: 'public', template: 'legal', label: 'legal information' };
  if (path === '/about') return { area: 'public', template: 'about', label: 'about the company' };
  if (path === '/sustainability') return { area: 'public', template: 'sustainability', label: 'sustainability' };
  if (path === '/local-supply') return { area: 'public', template: 'local-supply', label: 'local supply' };
  return { area: 'public', template: 'story', label: 'company story' };
}
