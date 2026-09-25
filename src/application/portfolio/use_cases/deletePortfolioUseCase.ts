import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';

export interface DeletePortfolioRequest {
  householdId: string;
  portfolioId: string;
  auth: AuthContext;
}

export class DeletePortfolioUseCase {
  async execute(request: DeletePortfolioRequest): Promise<void> {
    const { householdId, portfolioId, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    return portfolioRepository.delete([householdId, portfolioId]);
  }
}

export const deletePortfolioUseCase = new DeletePortfolioUseCase();
