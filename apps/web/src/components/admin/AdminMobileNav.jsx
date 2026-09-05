import React from 'react';
import { BarChart3, CalendarDays, LayoutDashboard, Menu, ShoppingCart, Truck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { canAccessAdminPath } from '@/lib/access-control';

const destinationPriority = [
  { label: 'Home', path: '/admin', icon: LayoutDashboard },
  { label: 'Activities', path: '/admin/farm-daily-activities/activities/overview', icon: BarChart3 },
  { label: 'Calendar', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Dispatch', path: '/admin/logistics', icon: Truck },
];

const isActive = (pathname, path) => path === '/admin'
  ? pathname === path
  : pathname === path || pathname.startsWith(`${path}/`);

export default function AdminMobileNav({ user, onMore }) {
  const location = useLocation();
  const visibleDestinations = destinationPriority
    .filter((item) => canAccessAdminPath(user, item.path))
    .slice(0, 4);

  return (
    <nav className="admin-mobile-nav fixed inset-x-0 bottom-0 z-[70] grid grid-cols-5 border-t border-[#ebebeb] bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Quick navigation">
      {visibleDestinations.map((item) => {
        const Icon = item.icon;
        const active = isActive(location.pathname, item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 text-[10px] font-semibold transition-colors', active ? 'bg-[#2E7D32] text-white' : 'text-[#575757] hover:bg-[#9ACD32] hover:text-[#173d24]')}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      {Array.from({ length: Math.max(0, 4 - visibleDestinations.length) }).map((_, index) => <span key={`spacer-${index}`} aria-hidden="true" />)}
      <button type="button" onClick={onMore} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1 text-[10px] font-semibold text-[#575757] transition-colors hover:bg-[#9ACD32] hover:text-[#173d24]" aria-label="Open all admin navigation">
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
