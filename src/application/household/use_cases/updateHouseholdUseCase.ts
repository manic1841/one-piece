import { invalidateRouteAccessCache } from '@/application/auth/routeAccessCache';
import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

import { invalidateHouseholdCache } from './getHouseholdUseCase';

export interface UpdateHouseholdRequest {
  householdId: string;
  updates: Partial<Household>;
  userEmail: string;
}

export class UpdateHouseholdUseCase {
  async execute(request: UpdateHouseholdRequest): Promise<void> {
    const { householdId, updates, userEmail } = request;
    await householdRepository.update([householdId], updates, userEmail);
    invalidateHouseholdCache();
    // Member add/remove/role change changes who may pass a route guard, so the
    // cached decisions go with the household cache. Backup restore writes the
    // membership too and invalidates both itself.
    invalidateRouteAccessCache();
  }
}

export const updateHouseholdUseCase = new UpdateHouseholdUseCase();
