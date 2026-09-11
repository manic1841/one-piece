import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface GetHouseholdRequest {
  householdId: string;
}

export class GetHouseholdUseCase {
  async execute(request: GetHouseholdRequest): Promise<Household | null> {
    const { householdId } = request;
    return await householdRepository.get([householdId]);
  }
}

export const getHouseholdUseCase = new GetHouseholdUseCase();
