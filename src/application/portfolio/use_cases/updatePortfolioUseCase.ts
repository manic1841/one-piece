import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';

export interface UpdatePortfolioRequest {
  householdId: string;
  portfolioId: string;
  updates: Partial<Portfolio>;
  userEmail: string;
  auth: AuthContext;
}

// Spec 11: portfolio links cannot be changed after creation.
export class UpdatePortfolioUseCase {
  async execute(request: UpdatePortfolioRequest): Promise<void> {
    const { householdId, portfolioId, updates, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    if ('securitiesAccountId' in updates || 'bankAccountId' in updates) {
      throw new Error('投資組合的帳戶連結建立後不可變更');
    }
    return portfolioRepository.update([householdId, portfolioId], updates, userEmail);
  }
}

export const updatePortfolioUseCase = new UpdatePortfolioUseCase();
