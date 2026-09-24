import React from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useRouteAuthorization } from '@/ui/features/app/hooks/useRouteAuthorization';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireHousehold?: boolean;
}

/**
 * Surface 只把 Controller 的決策映射成導向，不自行編排授權（見
 * docs/ui/ui-layer-architecture.md §4，issue #185）。
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireHousehold = false }) => {
  const { outcome } = useRouteAuthorization(requireHousehold);
  const location = useLocation();

  if (outcome === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (outcome === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (outcome === 'access-denied') {
    return <Navigate to="/access-denied" replace />;
  }

  if (outcome === 'onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
