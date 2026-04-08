import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type AuthContext } from '@/application/types';

export interface GetPortfolioRequest {
  householdId: string;
  portfolioId: string;
  auth: AuthContext;
}

export class GetPortfolioUseCase {
  async execute(request: GetPortfolioRequest): Promise<Portfolio | null> {
    const { householdId, portfolioId, auth } = request;
    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.get([householdId, portfolioId]);
  }
}

export const getPortfolioUseCase = new GetPortfolioUseCase();
