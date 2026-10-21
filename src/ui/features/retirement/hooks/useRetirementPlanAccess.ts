import { useState } from 'react';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLoadOnce } from '@/ui/features/retirement/hooks/useLoadOnce';

/**
 * Whether the signed-in user may rename or delete plans. The application layer
 * is still the authority; this hook only decides which buttons to render.
 */
export function useRetirementPlanAccess(householdId: string | undefined) {
  const { user, isAdmin } = useAuthState();
  const [canManage, setCanManage] = useState(false);

  const { loading } = useLoadOnce(
    async () => {
      if (!user || !householdId) return false;
      if (isAdmin) return true;
      return householdPermissionService.isUserAdmin(householdId, user.uid);
    },
    setCanManage,
    [householdId, isAdmin, user],
    { initiallyLoading: true },
  );

  return { canManage, loading };
}
