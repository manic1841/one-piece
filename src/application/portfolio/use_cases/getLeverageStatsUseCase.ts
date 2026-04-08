import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getLatestSnapshotUseCase } from '@/application/account/use_cases/getLatestSnapshotUseCase';
import { type AuthContext } from '@/application/types';

export interface LeverageStats {
  totalExposure: number;
  totalNetValue: number;
  ratio: number;
}

export interface GetLeverageStatsRequest {
  householdId: string;
  auth: AuthContext;
}

export class GetLeverageStatsUseCase {
  async execute(request: GetLeverageStatsRequest): Promise<LeverageStats> {
    const { householdId, auth } = request;
    const accounts = await getAccountsUseCase.execute({ householdId, auth });
    let totalExposure = 0;
    let totalNetValue = 0;

    for (const account of accounts) {
      const latest = await getLatestSnapshotUseCase.execute({
        householdId,
        accountId: account.id,
        auth,
      });
      if (!latest) continue;

      totalNetValue += latest.amount;
      const holdings = latest.holdings || [];
      for (const holding of holdings) {
        const leverage = holding.leverage || 1;
        totalExposure += holding.marketValue * leverage;
      }
    }

    const ratio = totalNetValue > 0 ? totalExposure / totalNetValue : 0;
    return {
      totalExposure,
      totalNetValue,
      ratio,
    };
  }
}

export const getLeverageStatsUseCase = new GetLeverageStatsUseCase();
