import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';

export interface UnsettledStats {
  year: number;
  month: number;
  unsettledAccounts: Account[];
  unsettledPortfolios: Portfolio[];
  totalUnsettled: number;
}

export interface GetUnsettledStatsRequest {
  householdId: string;
  auth: AuthContext;
  year?: number;
  month?: number;
}

export class GetUnsettledStatsUseCase {
  async execute(request: GetUnsettledStatsRequest): Promise<UnsettledStats> {
    const { householdId, auth } = request;
    const now = new Date();
    const year = request.year ?? now.getFullYear();
    const month = request.month ?? now.getMonth() + 1;

    const [accounts, portfolios] = await Promise.all([
      getAccountsUseCase.execute({ householdId, auth }),
      listPortfoliosUseCase.execute({ householdId, auth }),
    ]);

    const activePortfolios = portfolios.filter((portfolio) => portfolio.isActive);

    const accountSettlementFlags = await Promise.all(
      accounts.map(async (account) => {
        const snapshots = await getAccountSnapshotsUseCase.execute({
          householdId,
          accountId: account.id,
          year,
          month,
          auth,
        });
        return { account, settled: snapshots.length > 0 };
      }),
    );

    const portfolioSettlementFlags = await Promise.all(
      activePortfolios.map(async (portfolio) => {
        const snapshots = await listPortfolioSnapshotsUseCase.execute({
          householdId,
          portfolioId: portfolio.id,
          year,
          month,
          auth,
        });
        return { portfolio, settled: snapshots.length > 0 };
      }),
    );

    const unsettledAccounts = accountSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.account);
    const unsettledPortfolios = portfolioSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.portfolio);

    return {
      year,
      month,
      unsettledAccounts,
      unsettledPortfolios,
      totalUnsettled: unsettledAccounts.length + unsettledPortfolios.length,
    };
  }
}

export const getUnsettledStatsUseCase = new GetUnsettledStatsUseCase();
