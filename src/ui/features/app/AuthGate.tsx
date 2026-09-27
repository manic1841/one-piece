import React from 'react';

import { AppFallback } from '@/ui/components/AppFallback';
import { useAuthGate } from '@/ui/features/app/hooks/useAuthGate';

/**
 * 全 app 的啟動閘門。infra 不 render UI，只把初始化失敗以資料形式放上 auth context
 * （見 docs/ui/ui-layer-architecture.md §5.1）；由本元件決定顯示 `AppFallback`、
 * 等待，或放行 children。
 *
 * 掛在路由樹之外，因此 `/login`、`/access-denied` 等非 `ProtectedRoute` 底下的路由
 * 也受同一個失敗畫面保護。
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startupFailure, loading } = useAuthGate();

  if (startupFailure) {
    return (
      <AppFallback
        title={startupFailure.title}
        description={startupFailure.description}
        hint={startupFailure.hint}
      />
    );
  }

  if (loading) {
    return null;
  }

  return <>{children}</>;
};
