import { updateHouseholdUseCase } from './updateHouseholdUseCase';

export interface UpdateHouseholdMemberRoleRequest {
  householdId: string;
  targetUid: string;
  newRole: string;
  adminEmail: string;
}

export class UpdateHouseholdMemberRoleUseCase {
  async execute(request: UpdateHouseholdMemberRoleRequest): Promise<void> {
    const { householdId, targetUid, newRole, adminEmail } = request;
    const updates = {
      [`members.${targetUid}.role`]: newRole,
    };
    await updateHouseholdUseCase.execute({ householdId, updates, userEmail: adminEmail });
  }
}

export const updateHouseholdMemberRoleUseCase = new UpdateHouseholdMemberRoleUseCase();
