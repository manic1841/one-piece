import { type Transaction } from 'firebase/firestore';

import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface GetHouseholdRequest {
  householdId: string;
  tx?: Transaction;
}

export class GetHouseholdUseCase {
  async execute(request: GetHouseholdRequest): Promise<Household | null> {
    const { householdId, tx } = request;
    return await householdRepository.get([householdId], tx);
  }
}

export const getHouseholdUseCase = new GetHouseholdUseCase();
