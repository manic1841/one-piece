import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { validatePortfolioConstraints } from '@/domains/portfolio/portfolioConstraints';
import { type PortfolioCreate } from '@/domains/portfolio/types/portfolio';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';

export interface CreatePortfolioRequest {
  householdId: string;
  portfolio: PortfolioCreate;
  userEmail: string;
  auth: AuthContext;
}

export class CreatePortfolioUseCase {
  async execute(request: CreatePortfolioRequest): Promise<string> {
    const { householdId, portfolio, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const accounts = await getAccountsUseCase.execute({ householdId, auth });
    const portfolios = await portfolioRepository.list([householdId]);
    validatePortfolioConstraints(
      {
        securitiesAccountId: portfolio.securitiesAccountId,
        bankAccountId: portfolio.bankAccountId,
      },
      {
        accounts,
        existingLinks: portfolios.map((existing) => ({
          securitiesAccountId: existing.securitiesAccountId,
          bankAccountId: existing.bankAccountId,
        })),
      },
    );

    return portfolioRepository.create([householdId], portfolio, userEmail);
  }
}

export const createPortfolioUseCase = new CreatePortfolioUseCase();
