import { useMemo } from 'react';

import { type AuthContext } from '@/application/types';
import { useAuth } from '@/infra/contexts/useAuth';

export function useAuthContext(): AuthContext {
  const { currentUser, isAdmin } = useAuth();

  return useMemo(
    () => ({
      uid: currentUser?.uid || '',
      email: currentUser?.email || '',
      isGlobalAdmin: isAdmin,
    }),
    [currentUser, isAdmin],
  );
}
