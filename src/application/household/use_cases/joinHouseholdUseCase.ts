import { updateUserProfileUseCase } from '@/application/auth/use_cases/updateUserProfileUseCase';
import { type UserProfile } from '@/domains/auth/user/types';
import { HouseholdNotFoundError, InvalidHouseholdInputError } from '@/domains/household/errors';

import { getHouseholdByNameUseCase } from './getHouseholdByNameUseCase';
import { getHouseholdUseCase } from './getHouseholdUseCase';

export interface JoinHouseholdRequest {
  householdId: string;
  user: UserProfile;
}

export class JoinHouseholdUseCase {
  async execute(request: JoinHouseholdRequest): Promise<void> {
    const { householdId, user } = request;
    const input = householdId.trim();

    if (!input) {
      throw new InvalidHouseholdInputError();
    }

    // Backward compatible behavior: treat input as id first, then exact name.
    let household = await getHouseholdUseCase.execute({ householdId: input });
    if (!household) {
      household = await getHouseholdByNameUseCase.execute({ name: input });
    }

    if (!household) {
      throw new HouseholdNotFoundError();
    }

    if (!household.members[user.uid]) {
      throw new Error(
        'You are not a member of this household. Please ask an owner to add your email first.',
      );
    }

    await updateUserProfileUseCase.execute({
      uid: user.uid,
      updates: { householdId: household.id },
    });
  }
}

export const joinHouseholdUseCase = new JoinHouseholdUseCase();
