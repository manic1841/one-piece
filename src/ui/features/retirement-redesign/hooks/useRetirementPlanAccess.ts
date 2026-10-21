import { useEffect, useState } from 'react';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/**
 * Whether the signed-in user may rename or delete plans. The application layer
 * is still the authority; this hook only decides which buttons to render.
 */
export function useRetirementPlanAccess(householdId: string | undefined) {
  const { user, isAdmin } = useAuthState();
  const [canManage, setCanManage] = useState(false);
  const { loading, run } = useLoadingTask({ initiallyLoading: true });

  useEffect(() => {
    void run(
      async () => {
        if (!user || !householdId) return false;
        if (isAdmin) return true;
        return householdPermissionService.isUserAdmin(householdId, user.uid);
      },
      {
        writeBack: (result) => {
          if (result.ok) setCanManage(result.value);
        },
      },
    );
  }, [householdId, isAdmin, run, user]);

  return { canManage, loading };
}
