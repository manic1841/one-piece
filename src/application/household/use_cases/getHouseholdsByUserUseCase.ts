import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

export interface GetHouseholdsByUserRequest {
  uid: string;
}

export class GetHouseholdsByUserUseCase {
  async execute(request: GetHouseholdsByUserRequest): Promise<Household[]> {
    const { uid } = request;
    // Note: This is an inefficient list all and filter.
    // In a real system, you'd use a query if Firestore supports array-contains or a subcollection.
    // For now, mirroring existing service logic.
    const allHouseholds = await householdRepository.list([]);
    return allHouseholds.filter((h) => h.members[uid] !== undefined);
  }
}

export const getHouseholdsByUserUseCase = new GetHouseholdsByUserUseCase();
