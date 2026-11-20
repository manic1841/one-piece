import { STARTUP_FAILURE_COPY, type StartupFailureCopy } from '@/ui/constants/app/startupFailure';
import { useAuthState } from '@/ui/contexts/useAuthState';

export interface AuthGateState {
  /** 非 null 表示啟動期不可回復的失敗，Surface 應顯示失敗畫面而非永久等待。 */
  startupFailure: StartupFailureCopy | null;
}

/**
 * `AuthGate` 的 Controller：把 infra 放上 auth context 的失敗碼（`initError`）投影成
 * 顯示層需要的資料。文案查 `constants`，infra 只給碼
 * （見 docs/ui/ui-layer-architecture.md §5.1）。
 *
 * 載入不經過這裡：初始化期間路由照常 render，等待由 `ProtectedRoute` 呈現。
 */
export function useAuthGate(): AuthGateState {
  const { initError } = useAuthState();

  return {
    startupFailure: initError ? STARTUP_FAILURE_COPY[initError] : null,
  };
}
