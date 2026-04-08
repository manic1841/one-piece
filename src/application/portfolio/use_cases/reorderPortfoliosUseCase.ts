import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface ReorderPortfoliosRequest {
  householdId: string;
  portfolioOrders: Array<{ id: string; order: number }>;
  userEmail: string;
  auth: AuthContext;
}

export class ReorderPortfoliosUseCase {
  async execute(request: ReorderPortfoliosRequest): Promise<void> {
    const { householdId, portfolioOrders, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const updatePromises = portfolioOrders.map(({ id, order }) =>
      portfolioRepository.update([householdId, id], { order }, userEmail),
    );
    await Promise.all(updatePromises);
  }
}

export const reorderPortfoliosUseCase = new ReorderPortfoliosUseCase();
