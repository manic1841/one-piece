import { RoleEnum } from '@/domains/household/role';

import { getHouseholdUseCase } from './use_cases/getHouseholdUseCase';

/**
 * 讀取型 use case 不要直接 `await` 這裡的方法：改走
 * `@/application/common/readGuard`，讓檢查與查詢並行（見
 * docs/architecture.md §2「讀取的權限前門與量測」）。寫入型維持先驗後寫。
 */
export class HouseholdPermissionService {
  async isUserMember(householdId: string, uid: string): Promise<boolean> {
    const household = await getHouseholdUseCase.execute({ householdId });
    if (!household) return false;
    return !!household.members[uid];
  }

  async isUserAdmin(householdId: string, uid: string): Promise<boolean> {
    const household = await getHouseholdUseCase.execute({ householdId });
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
  ): Promise<void> {
    if (isGlobalAdmin) return;

    const isAdmin = await this.isUserAdmin(householdId, uid);
    if (!isAdmin) {
      throw new Error(
        'Permission denied: Only household owners or admins can perform this action.',
      );
    }
  }
}

export const householdPermissionService = new HouseholdPermissionService();
