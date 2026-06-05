import { limit, where } from 'firebase/firestore';

import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface GetHouseholdByNameRequest {
  name: string;
}

export class GetHouseholdByNameUseCase {
  async execute(request: GetHouseholdByNameRequest): Promise<Household | null> {
    const name = request.name.trim();
    if (!name) {
      throw new Error('Household name is required');
    }

    const households = await householdRepository.list([], [where('name', '==', name), limit(2)]);

    if (households.length > 1) {
      throw new Error('Multiple households found with the same name. Please use household ID.');
    }

    return households[0] ?? null;
  }
}

export const getHouseholdByNameUseCase = new GetHouseholdByNameUseCase();
