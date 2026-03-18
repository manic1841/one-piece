import { type Transaction } from 'firebase/firestore';
import { getHouseholdUseCase } from './use_cases/getHouseholdUseCase';
import { RoleEnum } from '@/domains/auth/role';

export class HouseholdPermissionService {
  async isUserMember(householdId: string, uid: string): Promise<boolean> {
    const household = await getHouseholdUseCase.execute({ householdId });
    if (!household) return false;
    return !!household.members[uid];
  }

  async isUserAdmin(householdId: string, uid: string, tx?: Transaction): Promise<boolean> {
    const household = await getHouseholdUseCase.execute({ householdId, tx });
    if (!household) return false;
    const role = household.members[uid]?.role;
    return role === RoleEnum.ADMIN || role === RoleEnum.OWNER;
  }

  async assertReadPermission(
    householdId: string,
    uid: string,
    isGlobalAdmin?: boolean,
  ): Promise<void> {
    if (isGlobalAdmin) return;

    const isMember = await this.isUserMember(householdId, uid);
    if (!isMember) {
      throw new Error(
        'Permission denied: You must be a member of this household to view this data.',
      );
    }
  }

  async assertWritePermission(
    householdId: string,
    uid: string,
    isGlobalAdmin?: boolean,
    tx?: Transaction,
  ): Promise<void> {
    if (isGlobalAdmin) return;

    const isAdmin = await this.isUserAdmin(householdId, uid, tx);
    if (!isAdmin) {
      throw new Error(
        'Permission denied: Only household owners or admins can perform this action.',
      );
    }
  }
}

export const householdPermissionService = new HouseholdPermissionService();
