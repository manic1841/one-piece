import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type PortfolioCreate } from '@/domains/portfolio/types/portfolio';
import { type AuthContext } from '@/application/types';

export interface CreatePortfolioRequest {
  householdId: string;
  portfolio: PortfolioCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreatePortfolioUseCase {
  async execute(request: CreatePortfolioRequest): Promise<string> {
    const { householdId, portfolio, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.create([householdId], portfolio, userEmail);
  }
}

export const createPortfolioUseCase = new CreatePortfolioUseCase();
