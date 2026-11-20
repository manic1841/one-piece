import React from 'react';

import { AppFallback } from '@/ui/components/AppFallback';
import { useAuthGate } from '@/ui/features/app/hooks/useAuthGate';

/**
 * 全 app 的啟動失敗閘門。infra 不 render UI，只把初始化失敗以資料形式放上 auth context
 * （見 docs/ui/ui-layer-architecture.md §5.1）；由本元件決定顯示 `AppFallback` 或放行。
 *
 * **只擋失敗，不擋載入**：認證初始化期間照常 render 路由樹，`/login`、`/access-denied`
 * 因此立刻可見，不必等一個與它們無關的 SDK 回呼。受保護路由的等待由
 * `ProtectedRoute` 自己呈現（§5.2）。
 *
 * 掛在路由樹之外，因此非 `ProtectedRoute` 底下的路由也受同一個失敗畫面保護。
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startupFailure } = useAuthGate();

  if (startupFailure) {
    return (
      <AppFallback
        title={startupFailure.title}
        description={startupFailure.description}
        hint={startupFailure.hint}
      />
    );
  }

  return <>{children}</>;
};
