import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse, Truck,
  Sprout, Scissors, UserCog, FileText, Banknote, Ship, BarChart3,
  FolderOpen, Newspaper, Leaf, Settings, ChevronRight
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'CRM', path: '/admin/crm', icon: Users },
      { label: 'Sales', path: '/admin/sales', icon: ShoppingCart },
      { label: 'Orders', path: '/admin/orders', icon: Package },
      { label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
      { label: 'Logistics', path: '/admin/logistics', icon: Truck },
    ],
  },
  {
    title: 'Production',
    items: [
      { label: 'Farms', path: '/admin/farms', icon: Sprout },
      { label: 'Harvests', path: '/admin/harvests', icon: Scissors },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Procurement', path: '/admin/procurement', icon: FileText },
      { label: 'Finance', path: '/admin/finance', icon: Banknote },
      { label: 'Export Ops', path: '/admin/export-ops', icon: Ship },
      { label: 'Human Resources', path: '/admin/hr', icon: UserCog },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Content', path: '/admin/content', icon: Newspaper },
      { label: 'Documents', path: '/admin/documents', icon: FolderOpen },
      { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <BrandLogo className="h-9" />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                  {item.label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Leaf className="h-4 w-4" />
          Back to Website
        </Link>
      </div>
    </aside>
  );
}