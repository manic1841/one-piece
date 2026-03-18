import { householdRepository } from '@/infra/repositories/householdRepository';
import { type Household } from '@/infra/schemas/household';
import { type Transaction } from 'firebase/firestore';

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
