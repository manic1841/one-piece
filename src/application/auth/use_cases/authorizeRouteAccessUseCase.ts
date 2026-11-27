import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { measure } from '@/shared/perf';

import { resolveRouteAccessDecision, routeAccessCacheKey } from '../routeAccessCache';
import { isUserAuthorizedUseCase } from './isUserAuthorizedUseCase';

/** What the router should do with the current visitor. */
export type RouteAccessOutcome = 'allow' | 'access-denied' | 'onboarding';

export interface AuthorizeRouteAccessRequest {
  /** The acting identity, as projected by `useAuthIdentity()`. */
  auth: AuthContext;
  /** The household carried by the user's profile; null before onboarding. */
  householdId: string | null;
  requireHousehold: boolean;
}

/**
 * Decides whether the acting user may pass a route guard. This is a workflow: it composes the
 * app whitelist check (`isUserAuthorizedUseCase`) with the household membership check
 * (`householdPermissionService`) into a single decision, so no Surface has to orchestrate them
 * (see docs/ui/ui-layer-architecture.md §4 "No Hidden Workflow", issue #185).
 *
 * Session state is deliberately absent: whether anyone is signed in at all is an infra observation
 * the UI context already carries (see ADR-0062), not an authorization decision.
 *
 * A result is reused for the same inputs until it expires or a whitelist/membership write
 * invalidates it (`../routeAccessCache`); failures are never reused, so a broken check retries on
 * the next navigation instead of pinning the visitor out.
 */
export class AuthorizeRouteAccessUseCase {
  async execute(request: AuthorizeRouteAccessRequest): Promise<RouteAccessOutcome> {
    const key = routeAccessCacheKey({
      uid: request.auth.uid,
      email: request.auth.email ?? null,
      isGlobalAdmin: request.auth.isGlobalAdmin ?? false,
      householdId: request.householdId,
      requireHousehold: request.requireHousehold,
    });

    return resolveRouteAccessDecision(key, () =>
      measure('route access decision', () => this.decide(request)),
    );
  }

  private async decide(request: AuthorizeRouteAccessRequest): Promise<RouteAccessOutcome> {
    const { auth, householdId, requireHousehold } = request;
    const isGlobalAdmin = auth.isGlobalAdmin ?? false;

    // The two reads are independent, so they start together instead of queueing:
    // the route guard sits in front of every page mount, and a serial pair doubles
    // the time to first paint. A global admin skips both; membership is only
    // meaningful once a household exists.
    const isAuthorizedPromise = isGlobalAdmin
      ? Promise.resolve(true)
      : isUserAuthorizedUseCase.execute({ email: auth.email ?? null });
    const isMemberPromise =
      requireHousehold && householdId !== null && !isGlobalAdmin
        ? householdPermissionService.isUserMember(householdId, auth.uid)
        : Promise.resolve(false);

    // A global admin bypasses the whitelist, matching `assertReadPermission`'s early return.
    if (!(await isAuthorizedPromise)) return 'access-denied';

    if (!requireHousehold) return 'allow';

    // Having no household at all is a routing concern, not a permission one: nobody has anywhere
    // to land, admin included, so this is checked before the admin membership bypass.
    if (!householdId) return 'onboarding';

    if (isGlobalAdmin) return 'allow';

    return (await isMemberPromise) ? 'allow' : 'onboarding';
  }
}

export const authorizeRouteAccessUseCase = new AuthorizeRouteAccessUseCase();
