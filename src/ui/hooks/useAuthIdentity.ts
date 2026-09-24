import { useMemo } from 'react';

import { type AuthContext } from '@/application/types';
import { useAuthState } from '@/ui/contexts/useAuthState';

/**
 * 窄化的身分投影：`{ uid, email, isGlobalAdmin }`。
 *
 * 原本叫 `useAuthContext()`。它回傳的是**身分**（use case 的權限輸入），與 session
 * 狀態區分得開，因此在 React context 更名為 `AuthStateContext` 時一併更名
 * （issue #177 定案 Q4/Q12）。**對外介面形狀不變。**
 */
export function useAuthIdentity(): AuthContext {
  const { user, isAdmin } = useAuthState();

  return useMemo(
    () => ({
      uid: user?.uid || '',
      email: user?.email || '',
      isGlobalAdmin: isAdmin,
    }),
    [user, isAdmin],
  );
}
