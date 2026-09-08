import {
  reorderCollectionInTransaction,
  type ReorderEntry,
} from '@/application/common/reorderCollectionInTransaction';
import { ReorderCommandError, ReorderCommandErrorCode } from '@/application/common/reorderErrors';
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

    try {
      await reorderCollectionInTransaction({
        getDocRef: (id) => projectRepository.getDocRefById(householdId, id),
        orders: projectOrders as ReorderEntry[],
        userEmail,
      });
    } catch (error: unknown) {
      if (error instanceof ReorderCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new ReorderCommandError(ReorderCommandErrorCode.TRANSACTION_FAILED, message);
    }
  }
}

export const reorderProjectsUseCase = new ReorderProjectsUseCase();
