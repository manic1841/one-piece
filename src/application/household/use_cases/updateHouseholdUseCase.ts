import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface UpdateHouseholdRequest {
  householdId: string;
  updates: Partial<Household>;
  userEmail: string;
}

export class UpdateHouseholdUseCase {
  async execute(request: UpdateHouseholdRequest): Promise<void> {
    const { householdId, updates, userEmail } = request;
    await householdRepository.update([householdId], updates, userEmail);
  }
}

export const updateHouseholdUseCase = new UpdateHouseholdUseCase();
