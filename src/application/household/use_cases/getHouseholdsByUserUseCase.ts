import { limit, orderBy, where } from 'firebase/firestore';

import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { HOUSEHOLD_LIST_LIMIT } from '@/shared/readLimits';

export interface GetHouseholdsByUserRequest {
  uid: string;
}

export class GetHouseholdsByUserUseCase {
  async execute(request: GetHouseholdsByUserRequest): Promise<Household[]> {
    const { uid } = request;

    return await householdRepository.list(
      [],
      [
        where('memberUids', 'array-contains', uid),
        // 固定順序，截斷才會穩定落在同一批家戶。
        orderBy('__name__'),
        limit(HOUSEHOLD_LIST_LIMIT),
      ],
    );
  }
}

export const getHouseholdsByUserUseCase = new GetHouseholdsByUserUseCase();
