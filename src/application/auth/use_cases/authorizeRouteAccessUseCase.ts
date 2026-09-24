import { householdPermissionService } from '@/application/household/householdPermissionService';

import { isUserAuthorizedUseCase } from './isUserAuthorizedUseCase';

/** What the router should do with the current visitor. */
export type RouteAccessOutcome = 'allow' | 'access-denied' | 'onboarding';

export interface AuthorizeRouteAccessRequest {
  /** The signed-in user's email, or null when the identity provider gave none. */
  email: string | null;
  uid: string;
  isAdmin: boolean;
  /** The household carried by the user's profile; null before onboarding. */
  householdId: string | null;
  requireHousehold: boolean;
}

export interface RouteAccessDecision {
  outcome: RouteAccessOutcome;
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
  async execute(request: AuthorizeRouteAccessRequest): Promise<RouteAccessDecision> {
    const { email, uid, isAdmin, householdId, requireHousehold } = request;

    // A global admin bypasses both layers, matching `assertReadPermission`'s early return.
    if (isAdmin) return { outcome: 'allow' };

    const isAuthorized = await isUserAuthorizedUseCase.execute({ email });
    if (!isAuthorized) return { outcome: 'access-denied' };

    if (!requireHousehold) return { outcome: 'allow' };

    if (!householdId) return { outcome: 'onboarding' };

    const isMember = await householdPermissionService.isUserMember(householdId, uid);
    return { outcome: isMember ? 'allow' : 'onboarding' };
  }
}

export const authorizeRouteAccessUseCase = new AuthorizeRouteAccessUseCase();
