import { orderBy } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';

export interface GetStockGainLossRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export class GetStockGainLossUseCase {
  async execute(
    request: GetStockGainLossRequest,
  ): Promise<{ totalMarketValue: number; totalCost: number; totalGainLoss: number }> {
    const { householdId, year, month, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const portfolios = await portfolioRepository.list([householdId], [orderBy('order', 'asc')]);
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    let totalMarketValue = 0;
    let totalGainLoss = 0;

    for (const portfolio of portfolios) {
      const snapshot = await portfolioSnapshotRepository.getSnapshot(
        householdId,
        portfolio.id,
        yearMonth,
      );

      if (snapshot) {
        totalMarketValue += snapshot.totalValue;
        totalGainLoss += snapshot.performance.cumulativeGain;
      }
    }

    return {
      totalMarketValue,
      totalCost: totalMarketValue - totalGainLoss,
      totalGainLoss,
    };
  }
}

export const getStockGainLossUseCase = new GetStockGainLossUseCase();
