import { type Transaction } from 'firebase/firestore';

import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface UpdateHouseholdRequest {
  householdId: string;
  updates: Partial<Household>;
  userEmail: string;
  tx?: Transaction;
}

export class UpdateHouseholdUseCase {
  async execute(request: UpdateHouseholdRequest): Promise<void> {
    const { householdId, updates, userEmail, tx } = request;
    await householdRepository.update([householdId], updates, userEmail, tx);
  }
}

export const updateHouseholdUseCase = new UpdateHouseholdUseCase();
