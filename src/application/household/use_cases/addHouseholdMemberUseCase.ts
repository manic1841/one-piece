import { getUserByEmailUseCase } from '@/application/user/use_cases/getUserByEmailUseCase';

import { getHouseholdUseCase } from './getHouseholdUseCase';
import { updateHouseholdUseCase } from './updateHouseholdUseCase';

export interface AddHouseholdMemberRequest {
  householdId: string;
  email: string;
  role: string;
  adminEmail: string;
}

export class AddHouseholdMemberUseCase {
  async execute(request: AddHouseholdMemberRequest): Promise<void> {
    const { householdId, email, role, adminEmail } = request;

    const household = await getHouseholdUseCase.execute({ householdId });
    if (!household) {
      throw new Error('Household not found');
    }

    const userToInvite = await getUserByEmailUseCase.execute({ email });
    if (!userToInvite) {
      throw new Error('User with this email not found in the system');
    }

    const nextMemberUids = household.memberUids.includes(userToInvite.uid)
      ? household.memberUids
      : [...household.memberUids, userToInvite.uid];

    const updates = {
      [`members.${userToInvite.uid}`]: {
        role,
        joinedAt: new Date(),
      },
      memberUids: nextMemberUids,
    };
    await updateHouseholdUseCase.execute({ householdId, updates, userEmail: adminEmail });
  }
}

export const addHouseholdMemberUseCase = new AddHouseholdMemberUseCase();
