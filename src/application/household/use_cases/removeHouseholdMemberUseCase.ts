import { getHouseholdUseCase } from './getHouseholdUseCase';
import { updateHouseholdUseCase } from './updateHouseholdUseCase';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { updateUserProfileUseCase } from '@/application/user/use_cases/updateUserProfileUseCase';

export interface RemoveHouseholdMemberRequest {
  householdId: string;
  targetUid: string;
  adminEmail: string;
}

export class RemoveHouseholdMemberUseCase {
  async execute(request: RemoveHouseholdMemberRequest): Promise<void> {
    const { householdId, targetUid, adminEmail } = request;
    
    const household = await getHouseholdUseCase.execute({ householdId });
    if (!household) throw new Error('Household not found');

    const newMembers = { ...household.members };
    delete newMembers[targetUid];

    await updateHouseholdUseCase.execute({ 
      householdId, 
      updates: { members: newMembers }, 
      userEmail: adminEmail 
    });

    const targetProfile = await getUserProfileUseCase.execute({ uid: targetUid });
    if (targetProfile?.householdId === householdId) {
      await updateUserProfileUseCase.execute({ uid: targetUid, updates: { householdId: undefined } });
    }
  }
}

export const removeHouseholdMemberUseCase = new RemoveHouseholdMemberUseCase();
