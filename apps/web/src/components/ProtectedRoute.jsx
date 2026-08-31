import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageSkeleton from '@/components/shared/PageSkeleton';

const DefaultFallback = () => (
  <PageSkeleton fullPage />
);

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
  unauthorizedElement,
  canAccess,
}) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (canAccess && !canAccess(user)) {
    return unauthorizedElement;
  }

  return <Outlet />;
}
