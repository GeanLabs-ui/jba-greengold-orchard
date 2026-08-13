import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import { farmDailyActivitiesNavigation } from '@/lib/farm-navigation';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Warehouse, Truck,
  UserCog, FileText, Banknote, Ship, BarChart3,
  FolderOpen, Newspaper, Leaf, Settings, ChevronRight, FileCheck2,
  PanelLeftClose, PanelLeftOpen, MessageSquareText, CalendarDays
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { subscribeToDataChanges } from '@/lib/data-sync';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath } from '@/lib/access-control';

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
      { label: 'Client Inquiries', path: '/admin/inquiries', icon: MessageSquareText, countKey: 'inquiries' },
      { label: 'Sales', path: '/admin/sales', icon: ShoppingCart },
      { label: 'Orders', path: '/admin/orders', icon: Package, countKey: 'orders' },
      { label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
      { label: 'Logistics', path: '/admin/logistics', icon: Truck },
    ],
  },
  {
    title: 'Production',
    items: [
      { label: 'Farm Daily Activities', path: '/admin/farm-daily-activities', subheading: true },
      ...farmDailyActivitiesNavigation.map(({ title, path, icon }) => ({ label: title, path, icon })),
      { label: 'Production Calendar', path: '/admin/calendar', icon: CalendarDays, countKey: 'calendar' },
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
  const { user } = useAuth();
  const location = useLocation();
  const [fdaExpanded, setFdaExpanded] = useState(false);
  const prevPathnameRef = useRef(location.pathname);
  const [attentionCounts, setAttentionCounts] = useState({ inquiries: 0, orders: 0, calendar: 0 });

  useEffect(() => {
    prevPathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    let timer;
    const loadCounts = () => Promise.all([
      base44.entities.Inquiry.list('-created_date', 250).catch(() => []),
      base44.entities.Order.list('-order_date', 250).catch(() => []),
      base44.entities.CalendarEvent.list('start_at', 250).catch(() => []),
    ]).then(([inquiries, orders, calendarEvents]) => {
      if (!active) return;
      const now = new Date();
      setAttentionCounts({
        inquiries: inquiries.filter((item) => item.status === 'new' || !item.status).length,
        orders: orders.filter((item) => item.status === 'confirmed').length,
        calendar: calendarEvents.filter((item) => new Date(item.end_at || item.start_at) < now && !['completed', 'cancelled'].includes(item.status)).length,
      });
    });
    loadCounts();
    const unsubscribe = subscribeToDataChanges(() => {
      clearTimeout(timer);
      timer = setTimeout(loadCounts, 120);
    }, ['Inquiry', 'Order', 'CalendarEvent']);
    const interval = window.setInterval(loadCounts, 30000);
    return () => { active = false; clearTimeout(timer); clearInterval(interval); unsubscribe(); };
  }, []);

  const accessibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdminPath(user, item.path)) }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={`admin-sidebar flex h-full shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
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
        {accessibleSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              if (item.subheading) {
                return collapsed ? null : (
                  <p
                    key={item.path}
                    className="mt-3 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {item.label}
                  </p>
                );
              }

              const isActive = item.path === '/admin'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;
              const isFDA = item.path === '/admin/farm-daily-activities';

              if (isFDA) {
                return (
                  <div key={item.path} className="flex flex-col">
                    <Link
                      to="/admin/farm-daily-activities/activities/overview"
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
                  className={`group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                  {!collapsed && item.label}
                  {item.countKey && attentionCounts[item.countKey] > 0 && (
                    <span className={`${collapsed ? 'absolute ml-7 -mt-5 h-2.5 w-2.5 p-0' : 'ml-auto min-w-5 px-1.5 py-0.5'} rounded-full bg-primary text-center text-[10px] font-bold text-primary-foreground`}>
                      {!collapsed && (attentionCounts[item.countKey] > 99 ? '99+' : attentionCounts[item.countKey])}
                    </span>
                  )}
                  {isActive && !collapsed && !item.countKey && <ChevronRight className="ml-auto h-4 w-4" />}
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
