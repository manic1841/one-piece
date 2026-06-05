import { getHouseholdUseCase } from './getHouseholdUseCase';
import { updateHouseholdUseCase } from './updateHouseholdUseCase';

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
    const newMemberUids = household.memberUids.filter((uid) => uid !== targetUid);

    await updateHouseholdUseCase.execute({
      householdId,
      updates: { members: newMembers, memberUids: newMemberUids },
      userEmail: adminEmail,
    });
  }
}

export const removeHouseholdMemberUseCase = new RemoveHouseholdMemberUseCase();
