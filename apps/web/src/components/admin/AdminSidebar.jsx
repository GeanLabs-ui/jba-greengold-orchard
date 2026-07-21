import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import { farmDailyActivitiesNavigation } from '@/lib/farm-navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse, Truck,
  Sprout, Scissors, UserCog, FileText, Banknote, Ship, BarChart3,
  FolderOpen, Newspaper, Leaf, Settings, ChevronRight, FileCheck2,
  PanelLeftClose, PanelLeftOpen, ClipboardList
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
      { label: 'Farm Daily Activities', path: '/admin/farm-daily-activities', icon: ClipboardList },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Procurement', path: '/admin/procurement', icon: FileText },
      { label: 'Finance', path: '/admin/finance', icon: Banknote },
      { label: 'Export Ops', path: '/admin/export-ops', icon: Ship },
      { label: 'Human Resources', path: '/admin/hr', icon: UserCog },
      { label: 'Applications ATS', path: '/admin/applications', icon: FileCheck2 },
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

export default function AdminSidebar({ collapsed = false, onToggleCollapsed }) {
  const location = useLocation();
  const [fdaExpanded, setFdaExpanded] = useState(
    location.pathname.startsWith('/admin/farm-daily-activities')
  );

  useEffect(() => {
    if (location.pathname.startsWith('/admin/farm-daily-activities')) {
      setFdaExpanded(true);
    }
  }, [location.pathname]);

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex h-16 items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'gap-2 px-4'}`}>
        {!collapsed && <BrandLogo className="h-16" />}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${collapsed ? '' : 'ml-auto'} hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto scrollbar-thin py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = item.path === '/admin'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;
              const isFDA = item.path === '/admin/farm-daily-activities';

              if (isFDA) {
                return (
                  <div key={item.path} className="flex flex-col">
                    <Link
                      to="/admin/farm-daily-activities/dashboard"
                      onClick={() => setFdaExpanded(!fdaExpanded)}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                        collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                      } ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && (
                        <span className="ml-auto text-xs text-muted-foreground transition-transform">
                          {fdaExpanded ? '▼' : '▶'}
                        </span>
                      )}
                    </Link>
                    {fdaExpanded && !collapsed && (
                      <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                        {farmDailyActivitiesNavigation.map((subItem) => {
                          const isSubActive = location.pathname.startsWith(subItem.path);
                          const SubIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              className={`flex items-center gap-2 rounded-md py-1.5 px-2 text-xs font-medium transition-colors ${
                                isSubActive
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <SubIcon className="h-3.5 w-3.5" />
                              <span>{subItem.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                  {!collapsed && item.label}
                  {isActive && !collapsed && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-3'}`}>
        <Link
          to="/"
          title={collapsed ? 'Back to Website' : undefined}
          className={`flex items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            collapsed ? 'justify-center px-2' : 'gap-2 px-3'
          }`}
        >
          <Leaf className="h-4 w-4" />
          {!collapsed && 'Back to Website'}
        </Link>
      </div>
    </aside>
  );
}
