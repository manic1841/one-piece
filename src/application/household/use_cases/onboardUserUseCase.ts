import { createHouseholdUseCase } from './createHouseholdUseCase';
import { joinHouseholdUseCase } from './joinHouseholdUseCase';
import { updateUserProfileUseCase } from '@/application/user/use_cases/updateUserProfileUseCase';
import { type UserProfile } from '@/domains/user/types';

export interface OnboardUserRequest {
  input: string;
  userProfile: UserProfile;
  userEmail: string;
  isAdmin: boolean;
}

export class OnboardUserUseCase {
  async execute(request: OnboardUserRequest): Promise<void> {
    const { input, userProfile, userEmail, isAdmin } = request;
    const householdId = input.trim();

    try {
      // 1. Try to join as if input is a householdId
      await joinHouseholdUseCase.execute({
        householdId,
        user: userProfile,
      });
    } catch (joinErr: unknown) {
      // 2. If join fails and user is admin, try to create new household
      if (isAdmin) {
        const newHouseholdId = await createHouseholdUseCase.execute({
          data: {
            name: householdId,
            members: {
              [userProfile.uid]: {
                role: 'owner',
                joinedAt: new Date(),
              },
            },
          },
          userEmail: userEmail,
        });

        // 3. Update user profile with new householdId
        await updateUserProfileUseCase.execute({
          uid: userProfile.uid,
          updates: { householdId: newHouseholdId },
        });
      } else {
        // If not admin and join failed, re-throw the join error
        throw joinErr;
      }
    }
  }
}

export const onboardUserUseCase = new OnboardUserUseCase();
