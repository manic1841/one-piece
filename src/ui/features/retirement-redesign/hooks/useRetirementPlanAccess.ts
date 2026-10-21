import { useEffect, useState } from 'react';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuthState } from '@/ui/contexts/useAuthState';

/**
 * Whether the signed-in user may rename or delete plans. Global admins bypass
 * the household role check, matching the application-layer guard.
 */
export function useRetirementPlanAccess(householdId: string | undefined) {
  const { user, isAdmin } = useAuthState();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user || !householdId) {
        if (!cancelled) {
          setCanManage(false);
          setLoading(false);
        }
        return;
      }

      if (isAdmin) {
        if (!cancelled) {
          setCanManage(true);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const allowed = await householdPermissionService.isUserAdmin(householdId, user.uid);
        if (!cancelled) setCanManage(allowed);
      } catch {
        if (!cancelled) setCanManage(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [householdId, isAdmin, user]);

  return { canManage, loading };
}
