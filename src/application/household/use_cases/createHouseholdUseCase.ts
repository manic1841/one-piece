import { type HouseholdCreate } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface CreateHouseholdRequest {
  data: HouseholdCreate;
  userEmail: string;
}

export class CreateHouseholdUseCase {
  async execute(request: CreateHouseholdRequest): Promise<string> {
    const { data, userEmail } = request;
    return await householdRepository.create([], data, userEmail);
  }
}

export const createHouseholdUseCase = new CreateHouseholdUseCase();
