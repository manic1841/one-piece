import React from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { GateSurface } from '@/ui/components/GateSurface';
import { Skeleton } from '@/ui/components/Skeleton';
import { useRouteAuthorization } from '@/ui/features/app/hooks/useRouteAuthorization';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireHousehold?: boolean;
}

/**
 * 授權尚未落定時的等待畫面。認證初始化與授權查詢都在這裡，不在 `AuthGate`，
 * 因此 `/login` 這類不受保護的入口不必跟著等（見 docs/ui/ui-layer-architecture.md
 * §5.2）。版面沿用入口殼，內容用 Skeleton。
 */
const PendingSurface: React.FC = () => (
  <div aria-busy="true" aria-label="載入中">
    <GateSurface className="space-y-4">
      <Skeleton className="mx-auto h-6 w-40" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
    </GateSurface>
  </div>
);

/**
 * Surface 只把 Controller 的決策映射成導向，不自行編排授權（見
 * docs/ui/ui-layer-architecture.md §4，issue #185）。
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireHousehold = false }) => {
  const { outcome } = useRouteAuthorization(requireHousehold);
  const location = useLocation();

  if (outcome === 'pending') {
    return <PendingSurface />;
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
