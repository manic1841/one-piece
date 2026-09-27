import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';

export interface DeletePortfolioSnapshotRequest {
  householdId: string;
  portfolioId: string;
  snapshotId: string;
  auth: AuthContext;
}

export class DeletePortfolioSnapshotUseCase {
  async execute(request: DeletePortfolioSnapshotRequest): Promise<void> {
    const { householdId, portfolioId, snapshotId, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    return portfolioSnapshotRepository.delete([householdId, portfolioId, snapshotId]);
  }
}

export const deletePortfolioSnapshotUseCase = new DeletePortfolioSnapshotUseCase();
