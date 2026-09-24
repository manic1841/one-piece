import { useAuthState } from '@/ui/contexts/useAuthState';
import {
  STARTUP_FAILURE_COPY,
  type StartupFailureCopy,
} from '@/ui/constants/app/startupFailure';

export interface AuthGateState {
  /** 非 null 表示啟動期不可回復的失敗，Surface 應顯示失敗畫面而非永久等待。 */
  startupFailure: StartupFailureCopy | null;
  loading: boolean;
}

/**
 * `AuthGate` 的 Controller：把 infra 放上 auth context 的失敗碼（`initError`）與
 * `loading` 投影成顯示層需要的資料。文案查 `constants`，infra 只給碼
 * （見 docs/ui/ui-layer-architecture.md §5.1）。
 */
export function useAuthGate(): AuthGateState {
  const { initError, loading } = useAuthState();

  return {
    startupFailure: initError ? STARTUP_FAILURE_COPY[initError] : null,
    loading,
  };
}
