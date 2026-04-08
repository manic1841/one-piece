import { getHouseholdUseCase } from './getHouseholdUseCase';
import { updateUserProfileUseCase } from '@/application/user/use_cases/updateUserProfileUseCase';

export interface SwitchHouseholdRequest {
  uid: string;
  householdId: string;
}

export class SwitchHouseholdUseCase {
  async execute(request: SwitchHouseholdRequest): Promise<void> {
    const { uid, householdId } = request;
    const household = await getHouseholdUseCase.execute({ householdId });
    if (!household) {
      throw new Error('Household not found');
    }

    if (!household.members[uid]) {
      throw new Error('You are not a member of this household');
    }

    await updateUserProfileUseCase.execute({ uid, updates: { householdId } });
  }
}

export const switchHouseholdUseCase = new SwitchHouseholdUseCase();
