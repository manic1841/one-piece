import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

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
 */
export class AuthorizeRouteAccessUseCase {
  async execute(request: AuthorizeRouteAccessRequest): Promise<RouteAccessOutcome> {
    const { auth, householdId, requireHousehold } = request;
    const isGlobalAdmin = auth.isGlobalAdmin ?? false;

    // A global admin bypasses the whitelist, matching `assertReadPermission`'s early return.
    const isAuthorized =
      isGlobalAdmin || (await isUserAuthorizedUseCase.execute({ email: auth.email ?? null }));
    if (!isAuthorized) return 'access-denied';

    if (!requireHousehold) return 'allow';

    // Having no household at all is a routing concern, not a permission one: nobody has anywhere
    // to land, admin included, so this is checked before the admin membership bypass.
    if (!householdId) return 'onboarding';

    if (isGlobalAdmin) return 'allow';

    const isMember = await householdPermissionService.isUserMember(householdId, auth.uid);
    return isMember ? 'allow' : 'onboarding';
  }
}

export const authorizeRouteAccessUseCase = new AuthorizeRouteAccessUseCase();
