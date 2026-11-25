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
  }
}

export const updateHouseholdUseCase = new UpdateHouseholdUseCase();
