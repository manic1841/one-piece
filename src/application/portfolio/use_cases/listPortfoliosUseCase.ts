import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type AuthContext } from '@/application/types';
import { orderBy } from 'firebase/firestore';

export interface ListPortfoliosRequest {
  householdId: string;
  auth: AuthContext;
}

export class ListPortfoliosUseCase {
  async execute(request: ListPortfoliosRequest): Promise<Portfolio[]> {
    const { householdId, auth } = request;
    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);
    return portfolioRepository.list([householdId], [orderBy('order', 'asc')]);
  }
}

export const listPortfoliosUseCase = new ListPortfoliosUseCase();
