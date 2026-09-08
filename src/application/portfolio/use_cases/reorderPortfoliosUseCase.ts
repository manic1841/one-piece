import {
  reorderCollectionInTransaction,
  type ReorderEntry,
} from '@/application/common/reorderCollectionInTransaction';
import { ReorderCommandError, ReorderCommandErrorCode } from '@/application/common/reorderErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';

export interface ReorderPortfoliosRequest {
  householdId: string;
  portfolioOrders: Array<{ id: string; order: number }>;
  userEmail: string;
  auth: AuthContext;
}

export class ReorderPortfoliosUseCase {
  async execute(request: ReorderPortfoliosRequest): Promise<void> {
    const { householdId, portfolioOrders, userEmail, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      await reorderCollectionInTransaction({
        getDocRef: (id) => portfolioRepository.getDocRefById(householdId, id),
        orders: portfolioOrders as ReorderEntry[],
        userEmail,
      });
    } catch (error: unknown) {
      if (error instanceof ReorderCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new ReorderCommandError(ReorderCommandErrorCode.TRANSACTION_FAILED, message);
    }
  }
}

export const reorderPortfoliosUseCase = new ReorderPortfoliosUseCase();
