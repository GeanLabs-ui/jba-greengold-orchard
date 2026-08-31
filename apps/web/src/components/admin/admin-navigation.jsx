import {
  Banknote,
  ClipboardList,
  BarChart3,
  CalendarDays,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  MessageSquareText,
  Newspaper,
  Package,
  Settings,
  Ship,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react';
import { farmDailyActivitiesNavigation } from '@/lib/farm-navigation';

export const dashboardItem = { label: 'Dashboard', path: '/admin', icon: LayoutDashboard };

export const adminNavSections = [
  {
    title: 'Production',
    icon: Leaf,
    items: [
      ...farmDailyActivitiesNavigation.map(({ title, path, icon }) => ({ label: title, path, icon })),
      { label: 'Production Calendar', path: '/admin/calendar', icon: CalendarDays, countKey: 'calendar' },
    ],
  },
  {
    title: 'Business',
    icon: Users,
    items: [
      { label: 'CRM', path: '/admin/crm', icon: Users },
      { label: 'Client Inquiries', path: '/admin/inquiries', icon: MessageSquareText, countKey: 'inquiries' },
      { label: 'Sales', path: '/admin/sales', icon: ShoppingCart },
      { label: 'Orders', path: '/admin/orders', icon: Package, countKey: 'orders' },
      { label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
      { label: 'Logistics', path: '/admin/logistics', icon: Truck },
      { label: 'Procurement', path: '/admin/procurement', icon: FileText },
      { label: 'Finance', path: '/admin/finance', icon: Banknote },
      { label: 'Export Ops', path: '/admin/export-ops', icon: Ship },
    ],
  },
  {
    title: 'System',
    icon: Settings,
    items: [
      { label: 'HR', path: '/admin/hr', icon: UserCog },
      { label: 'Applications ATS', path: '/admin/applications', icon: FileCheck2 },
      { label: 'Content', path: '/admin/content', icon: Newspaper },
      { label: 'Documents', path: '/admin/documents', icon: FolderOpen },
      { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
      { label: 'System Log', path: '/admin/system-log', icon: ClipboardList },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

export const isAdminNavItemActive = (pathname, item) => (
  item.path === '/admin'
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(`${item.path}/`)
);
