import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { where, orderBy } from 'firebase/firestore';

export interface GetStockGainLossRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

export class GetStockGainLossUseCase {
  async execute(request: GetStockGainLossRequest): Promise<{ totalMarketValue: number; totalCost: number; totalGainLoss: number }> {
    const { householdId, year, month, auth } = request;
    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);

    const portfolios = await portfolioRepository.list([householdId], [orderBy('order', 'asc')]);
    let totalMarketValue = 0;
    let totalGainLoss = 0;

    for (const portfolio of portfolios) {
      const snapshots = await portfolioSnapshotRepository.list(
        [householdId, portfolio.id],
        [where('year', '==', year), where('month', '==', month), orderBy('year', 'desc'), orderBy('month', 'desc')]
      );

      if (snapshots.length > 0) {
        const snapshot = snapshots[0];
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
