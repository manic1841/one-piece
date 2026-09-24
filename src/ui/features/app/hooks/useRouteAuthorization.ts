import { useEffect, useState } from 'react';

import {
  authorizeRouteAccessUseCase,
  type RouteAccessOutcome,
} from '@/application/auth/use_cases/authorizeRouteAccessUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

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
 * Session 狀態（載入中、未登入）在 render 期推導而非存進 state；effect 只負責非同步的
 * 授權查詢。
 */
export function useRouteAuthorization(requireHousehold: boolean): { outcome: RouteAccessState } {
  const { user, userProfile, isAdmin, loading } = useAuthState();
  const householdId = userProfile?.householdId ?? null;
  const [resolved, setResolved] = useState<ResolvedDecision | null>(null);

  const requestKey = [user?.uid ?? '', isAdmin, householdId ?? '', requireHousehold].join('|');

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;

    void authorizeRouteAccessUseCase
      .execute({
        email: user.email,
        uid: user.uid,
        isAdmin,
        householdId,
        requireHousehold,
      })
      .then((decision) => {
        if (!cancelled) setResolved({ key: requestKey, outcome: decision.outcome });
      })
      .catch((error) => {
        // Fail closed: an unusable authorization check must not let anyone through.
        console.error('[useRouteAuthorization] Authorization check failed:', error);
        if (!cancelled) setResolved({ key: requestKey, outcome: 'access-denied' });
      });

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, householdId, loading, requireHousehold, requestKey]);

  if (loading) return { outcome: 'pending' };
  if (!user) return { outcome: 'unauthenticated' };
  if (resolved?.key === requestKey) return { outcome: resolved.outcome };

  return { outcome: 'pending' };
}
