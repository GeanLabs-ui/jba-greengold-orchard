import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DeploymentRecoveryBoundary from '@/components/shared/DeploymentRecoveryBoundary';
import { getFarmDailyActivitiesNavigationState } from '@/lib/farm-daily-activities-route';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function FarmDailyActivitiesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, activeItem } = getFarmDailyActivitiesNavigationState(location.pathname);
  const isAnalyticsOverview = location.pathname.replace(/\/$/, '') === '/admin/farm-daily-activities/activities/overview';
  const isMasterSchedule = location.pathname.replace(/\/$/, '') === '/admin/farm-daily-activities/activities/master-schedule';

  return (
    <div className={`space-y-6${isMasterSchedule ? ' farm-schedule-layout' : ''}`}>
      <div className="farm-activities-sticky-nav sticky top-0 z-40 -mx-2 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-2 py-2">
        <nav className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto scrollbar-thin" aria-label="Farm daily activities navigation">
          {items.map((child) => {
            const isChildActive = activeItem?.path === child.path;
            if (child.children) {
              return (
                <DropdownMenu key={child.path}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${isChildActive ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                      {location.pathname.endsWith('/issues') && child.screen === 'Risk Register' ? 'Risk and Issue Report' : child.title}<ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {child.children.map((page) => {
                      const isPageActive = location.pathname === page.path || location.pathname.startsWith(`${page.path}/`);
                      return <DropdownMenuItem key={page.path} onSelect={() => navigate(page.path)} aria-current={isPageActive ? 'page' : undefined} className={isPageActive ? 'bg-muted font-semibold' : ''}>{page.title}</DropdownMenuItem>;
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return (
              <button
                key={child.path}
                type="button"
                onClick={() => navigate(child.path)}
                aria-current={isChildActive ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isChildActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {child.title}
              </button>
            );
          })}
        </nav>
        {isMasterSchedule && <header className="farm-schedule-nav-heading"><div><h2>POST-HARVEST MANAGEMENT &amp; FLOWER INDUCTION GUIDE</h2><p>Management Review | Timing and observable readiness indicators</p></div></header>}
        {isAnalyticsOverview ? <div id="farm-analytics-header-controls" className="ml-auto flex flex-wrap items-center" /> : null}
      </div>

      <DeploymentRecoveryBoundary resetKey={`${location.pathname}${location.search}`}>
        <Outlet />
      </DeploymentRecoveryBoundary>
    </div>
  );
}
