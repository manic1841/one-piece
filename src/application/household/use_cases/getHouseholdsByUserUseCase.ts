import { where } from 'firebase/firestore';

import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface GetHouseholdsByUserRequest {
  uid: string;
}

export class GetHouseholdsByUserUseCase {
  async execute(request: GetHouseholdsByUserRequest): Promise<Household[]> {
    const { uid } = request;

    return await householdRepository.list([], [where('memberUids', 'array-contains', uid)]);
  }
}

export const getHouseholdsByUserUseCase = new GetHouseholdsByUserUseCase();
