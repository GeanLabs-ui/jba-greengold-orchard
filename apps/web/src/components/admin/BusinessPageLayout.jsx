import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import DeploymentRecoveryBoundary from '@/components/shared/DeploymentRecoveryBoundary';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath } from '@/lib/access-control';
import { businessPages } from '@/lib/business-navigation';

export function LegacyBusinessRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

export default function BusinessPageLayout({ section }) {
  const { user } = useAuth();
  const location = useLocation();
  const page = businessPages[section];
  const items = page.items.filter((item) => canAccessAdminPath(user, item.path));
  if (location.pathname.replace(/\/$/, '') === `/admin/${section}` && items.length) {
    return <Navigate to={`${items[0].path}${location.search}${location.hash}`} replace />;
  }
  return (
    <div className="space-y-6">
      {section !== 'marketing' && <h1 className="font-heading text-2xl font-bold text-foreground">{page.title}</h1>}
      <div className="farm-activities-sticky-nav sticky top-0 z-40 -mx-2 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-2 py-2">
        <nav className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto scrollbar-thin" aria-label={`${page.title} navigation`}>
          {items.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {item.title}
            </NavLink>
          ))}
        </nav>
      </div>
      <DeploymentRecoveryBoundary resetKey={`${location.pathname}${location.search}`}>
        <Outlet />
      </DeploymentRecoveryBoundary>
    </div>
  );
}
