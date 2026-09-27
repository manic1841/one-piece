import { useEffect, useState } from 'react';

import {
  type RouteAccessOutcome,
  authorizeRouteAccessUseCase,
} from '@/application/auth/use_cases/authorizeRouteAccessUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Everything the route guard can be showing. `pending` and `unauthenticated` are session
 * observations the UI reads; the rest are the workflow's authorization decision.
 */
export type RouteAccessState = 'pending' | 'unauthenticated' | RouteAccessOutcome;

interface ResolvedDecision {
  /** The request inputs this decision was produced for, so a stale one is never shown. */
  key: string;
  outcome: RouteAccessOutcome;
}

/**
 * `ProtectedRoute` 的 Controller：把 auth 狀態與授權 workflow 的決策收斂成單一結果，
 * Surface 只負責把結果映射成導向（見 docs/ui/ui-layer-architecture.md §4「No Hidden
 * Workflow」，issue #185）。
 *
 * 身分投影走 `useAuthIdentity()`（§4「Auth Assembly」）；`useAuthState()` 只用來讀身分
 * 不攜帶的 session 與 profile。Session 狀態在 render 期推導而非存進 state，effect 只負責
 * 非同步的授權查詢。
 */
export function useRouteAuthorization(requireHousehold: boolean): { outcome: RouteAccessState } {
  const auth = useAuthIdentity();
  const { userProfile, loading } = useAuthState();
  const householdId = userProfile?.householdId ?? null;

  const [resolved, setResolved] = useState<ResolvedDecision | null>(null);

  const requestKey = [auth.uid, auth.isGlobalAdmin, householdId ?? '', requireHousehold].join('|');

  useEffect(() => {
    if (loading || !auth.uid) return;

    let cancelled = false;

    void authorizeRouteAccessUseCase
      .execute({ auth, householdId, requireHousehold })
      .then((outcome) => {
        if (!cancelled) setResolved({ key: requestKey, outcome });
      })
      .catch((error) => {
        // Fail closed: an unusable authorization check must not let anyone through.
        console.error('[useRouteAuthorization] Authorization check failed:', error);
        if (!cancelled) setResolved({ key: requestKey, outcome: 'access-denied' });
      });

    return () => {
      cancelled = true;
    };
  }, [auth, householdId, loading, requireHousehold, requestKey]);

  if (loading) return { outcome: 'pending' };
  if (!auth.uid) return { outcome: 'unauthenticated' };
  if (resolved?.key === requestKey) return { outcome: resolved.outcome };

  return { outcome: 'pending' };
}
