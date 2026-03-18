import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type AuthContext } from '@/application/types';

export interface UpdatePortfolioRequest {
  householdId: string;
  portfolioId: string;
  updates: Partial<Portfolio>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdatePortfolioUseCase {
  async execute(request: UpdatePortfolioRequest): Promise<void> {
    const { householdId, portfolioId, updates, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.update([householdId, portfolioId], updates, userEmail);
  }
}

export const updatePortfolioUseCase = new UpdatePortfolioUseCase();
