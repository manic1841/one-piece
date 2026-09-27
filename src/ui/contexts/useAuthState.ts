import { useContext } from 'react';

import { type AuthState, AuthStateContext } from './AuthStateContext';

/**
 * 讀取完整的 UI 認證狀態。只有 Controller 層得呼叫
 * （見 docs/ui/ui-layer-architecture.md §2 規則 6）。
 *
 * 需要 `{ uid, email, isGlobalAdmin }` 這種窄化形狀時，用 `useAuthIdentity()`
 * （`@/ui/hooks/useAuthIdentity`），不要在此手組字面量。
 */
export const useAuthState = (): AuthState => {
  return useContext(AuthStateContext);
};
