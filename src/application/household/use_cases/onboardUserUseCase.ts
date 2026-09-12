import { createHouseholdUseCase } from './createHouseholdUseCase';
import { joinHouseholdUseCase } from './joinHouseholdUseCase';
import { updateUserProfileUseCase } from '@/application/user/use_cases/updateUserProfileUseCase';
import { isMissingHouseholdError } from '@/domains/household/errors';
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
      // 2. Only fall back to household creation for a verified missing/invalid
      //    household condition. Permission, network, and unknown errors propagate.
      if (isAdmin && isMissingHouseholdError(joinErr)) {
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
        // Non-admin, or admin with a non-not-found error: re-throw
        throw joinErr;
      }
    }
  }
}

export const onboardUserUseCase = new OnboardUserUseCase();
