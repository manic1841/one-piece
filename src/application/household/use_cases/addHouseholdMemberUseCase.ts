import { getUserByEmailUseCase } from '@/application/user/use_cases/getUserByEmailUseCase';

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

    const userToInvite = await getUserByEmailUseCase.execute({ email });
    if (!userToInvite) {
      throw new Error('User with this email not found in the system');
    }

    const updates = {
      [`members.${userToInvite.uid}`]: {
        role,
        joinedAt: new Date(),
      },
    };
    await updateHouseholdUseCase.execute({ householdId, updates, userEmail: adminEmail });
  }
}

export const addHouseholdMemberUseCase = new AddHouseholdMemberUseCase();
