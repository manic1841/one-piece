import {
  type ReorderEntry,
  reorderCollectionInTransaction,
} from '@/application/common/reorderCollectionInTransaction';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface ReorderProjectsRequest {
  householdId: string;
  projectOrders: Array<{ id: string; order: number }>;
  userEmail: string;
  auth: AuthContext;
}

export class ReorderProjectsUseCase {
  async execute(request: ReorderProjectsRequest): Promise<void> {
    const { householdId, projectOrders, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await reorderCollectionInTransaction({
      getDocRef: (id) => projectRepository.getDocRefById(householdId, id),
      orders: projectOrders as ReorderEntry[],
      userEmail,
    });
  }
}

export const reorderProjectsUseCase = new ReorderProjectsUseCase();
