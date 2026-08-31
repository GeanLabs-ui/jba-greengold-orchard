import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DeploymentRecoveryBoundary from '@/components/shared/DeploymentRecoveryBoundary';
import { getFarmDailyActivitiesNavigationState } from '@/lib/farm-daily-activities-route';

export default function FarmDailyActivitiesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, activeItem } = getFarmDailyActivitiesNavigationState(location.pathname);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-40 -mx-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <nav className="flex max-w-full items-center gap-2 overflow-x-auto scrollbar-thin" aria-label="Farm daily activities navigation">
          {items.map((child) => {
            const isChildActive = activeItem?.path === child.path;
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
      </div>

      <DeploymentRecoveryBoundary>
        <Outlet />
      </DeploymentRecoveryBoundary>
    </div>
  );
}
