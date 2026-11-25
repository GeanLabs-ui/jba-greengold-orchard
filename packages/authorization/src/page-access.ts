import { hasPermission, type Permission, type Role } from './permissions.js';

export type WorkspaceUser = { role: Role; pageAccess?: string[] | null; page_access?: string[] | null };
export const workspacePageDefaults: Partial<Record<Role, string[]>> = {
  admin: ['objectives','dashboard','crm','inquiries','sales','orders','inventory','logistics','farms','calendar','farm_daily_activities','procurement','finance','export_ops','hr','applications','content','documents','reports','system_log','settings'],
  farm_manager: ['objectives','dashboard','farms','calendar','farm_daily_activities','inventory','procurement'],
  farm_supervisor: ['objectives','dashboard','farms','calendar','farm_daily_activities'],
  inventory_officer: ['dashboard','inventory','procurement'], quality_officer: ['dashboard','farm_daily_activities','documents'],
  finance_officer: ['dashboard','finance','reports'], hr_officer: ['dashboard','hr','applications'],
  sales_officer: ['dashboard','crm','inquiries','sales','orders'], logistics_officer: ['dashboard','orders','logistics','export_ops'],
  content_editor: ['dashboard','content'], auditor: ['objectives','dashboard','documents','reports','system_log'],
};
export const isWorkspaceStaff = (user: WorkspaceUser | null | undefined) => Boolean(user && (user.role === 'super_admin' || workspacePageDefaults[user.role]));
export function hasWorkspacePage(user: WorkspaceUser | null | undefined, page: string): boolean {
  if (!isWorkspaceStaff(user) || !user) return false;
  if (user.role === 'super_admin') return true;
  return (user.pageAccess ?? user.page_access ?? workspacePageDefaults[user.role] ?? []).includes(page);
}
const production = ['farms','farm_daily_activities','reports','objectives'];
export const workspaceEntityPages: Record<string, string[]> = {
  Farm: [...production,'dashboard','calendar','inventory','finance','procurement','export_ops'],
  FarmBlock: [...production,'dashboard','calendar','inventory','finance','procurement','export_ops'],
  DailyActivity: [...production,'dashboard','calendar','finance'], FarmTask: [...production,'dashboard','calendar'],
  FarmProject: [...production,'dashboard','calendar'], FarmProcessLog: production, CropPlan: production, Issue: production,
  Harvest: [...production,'inventory','finance'], HarvestBatch: [...production,'inventory','export_ops'],
  FarmResourceUse: production, PesticideApplication: production, WorkOrder: production,
  Worker: [...production,'hr'], LaborSchedule: [...production,'hr'], FarmAttendance: [...production,'hr'],
  ActivityWorker: production, ActivityEquipment: production, ActivityInput: production,
  Equipment: [...production,'dashboard','inventory'], EquipmentUsage: [...production,'dashboard'],
  FarmInput: [...production,'inventory','procurement'], InputUsage: [...production,'inventory'], InventoryUsage: [...production,'inventory'],
  HarvestGrade: [...production,'inventory'], QualityCheck: production, WasteLoss: production, WeatherLog: production,
  FarmExpense: [...production,'finance'], DailyReport: [...production,'dashboard'], Approval: [...production,'dashboard'],
  FarmFinanceRecord: [...production,'finance'], FarmComplianceRecord: [...production,'dashboard'], FarmNote: production,
  FarmSeasonChecklist: production, FarmAnalyticsProjection: production,
  CalendarEvent: ['calendar',...production,'dashboard'], CalendarConnection: ['calendar'],
  Customer: ['crm','inquiries','sales','orders','finance','export_ops','reports'], Inquiry: ['crm','inquiries','reports'],
  Order: ['sales','orders','logistics','inventory','finance','export_ops','reports'],
  Invoice: ['sales','orders','finance','export_ops','reports'], Payment: ['sales','orders','finance','reports'],
  Quotation: ['crm','sales','orders','reports'], Return: ['sales','orders','inventory','finance','reports'],
  CustomerContract: ['crm','sales','export_ops','reports'],
  StockItem: ['inventory','procurement',...production,'sales','orders','reports'],
  Warehouse: ['inventory','logistics','export_ops'], StockMovement: ['inventory','procurement',...production,'logistics'],
  Delivery: ['logistics','orders','export_ops','reports'], Vehicle: ['logistics','export_ops'],
  Supplier: ['procurement','inventory','finance','reports'], PurchaseOrder: ['procurement','inventory','finance','reports'],
  Expense: ['finance','reports'], ExportShipment: ['export_ops','reports'], Certification: ['export_ops','documents',...production],
  Product: ['content','sales','orders','inventory','reports'], NewsPost: ['content'], ContentPage: ['content'], CustomerStory: ['content'],
  Department: ['hr','calendar','settings','farm_daily_activities'], Employee: ['hr'], Attendance: ['hr','farm_daily_activities'],
  JobApplication: ['applications','hr'], Document: ['documents'], AuditLog: ['system_log'],
  Notification: Object.values(workspacePageDefaults).flatMap(pages => pages || []),
};
export function canAccessWorkspaceEntity(user: WorkspaceUser | null | undefined, entity: string, write = false): boolean {
  if (!isWorkspaceStaff(user) || !user) return false;
  if (user.role === 'super_admin') return true;
  if (write && (entity === 'AuditLog' || entity === 'User')) return false;
  if (write && user.role === 'auditor' && !(user.pageAccess ?? user.page_access)) return false;
  // Overview and reporting dependencies grant reads, not edits to their sources.
  const pages = workspaceEntityPages[entity] || [];
  return pages.some(page => (!write || !['dashboard', 'reports', 'objectives'].includes(page)) && hasWorkspacePage(user, page));
}
export function hasWorkspacePermission(user: WorkspaceUser, permission: Permission): boolean {
  if (!isWorkspaceStaff(user)) return false;
  if (user.role === 'super_admin') return true;
  const explicit = user.pageAccess ?? user.page_access;
  if (!explicit) return hasPermission(user.role, permission);
  const family = permission.split('.')[0];
  if (permission.endsWith('.read')) {
    const entity = { farms: 'Farm', blocks: 'FarmBlock', harvest_periods: 'Harvest', activity_periods: 'FarmProcessLog', activities: 'DailyActivity', inventory: 'StockItem', finance: 'Expense' }[family];
    if (entity) return canAccessWorkspaceEntity(user, entity) || (['harvest_periods','activity_periods'].includes(family) && hasWorkspacePage(user, 'calendar'));
  }
  const pages: Record<string, string[]> = { farms: ['farms','farm_daily_activities'], blocks: ['farms','farm_daily_activities'],
    harvest_periods: ['farms','farm_daily_activities','calendar'], activity_periods: ['farms','farm_daily_activities','calendar'],
    activities: ['farm_daily_activities','farms'], inventory: ['inventory'], finance: ['finance'] };
  if ((permission.endsWith('.delete') || permission.endsWith('.approve')) && !hasPermission(user.role, permission)) return false;
  // Account/role administration remains governed by the dedicated administrator checks.
  return (pages[family] || []).some(page => hasWorkspacePage(user, page));
}
