import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type Project } from '@/domains/project/schemas';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';

export interface SettlementReadiness {
  year: number;
  month: number;
  isReady: boolean;
  unsettledAccounts: Account[];
  unsettledPortfolios: Portfolio[];
  unsettledDebts: DebtAccount[];
  unsettledProjects: Project[];
  totalUnsettled: number;
}

export interface GetSettlementReadinessRequest {
  householdId: string;
  auth: AuthContext;
  year?: number;
  month?: number;
}

export class GetSettlementReadinessUseCase {
  async execute(request: GetSettlementReadinessRequest): Promise<SettlementReadiness> {
    const { householdId, auth } = request;
    const now = new Date();
    const year = request.year ?? now.getFullYear();
    const month = request.month ?? now.getMonth() + 1;
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

    const [accounts, portfolios, debts, projects] = await Promise.all([
      getAccountsUseCase.execute({ householdId, auth }),
      listPortfoliosUseCase.execute({ householdId, auth }),
      listDebtAccountsUseCase.execute({ householdId }),
      listProjectsUseCase.execute({ householdId }),
    ]);

    const activeAccounts = accounts.filter((account) => account.isActive);
    const activePortfolios = portfolios.filter((portfolio) => portfolio.isActive);

    const accountSettlementFlags = await Promise.all(
      activeAccounts.map(async (account) => {
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

    const activeDebts = debts.filter((debt) => debt.isActive);
    const debtSettlementFlags = await Promise.all(
      activeDebts.map(async (debt) => {
        const snapshot = await debtSnapshotRepository.getSnapshot(householdId, debt.id, yearMonth);
        return { debt, settled: snapshot !== null };
      }),
    );

    const activeProjects = projects.filter((project) => project.isActive);
    const projectSettlementFlags = await Promise.all(
      activeProjects.map(async (project) => {
        const snapshots = await listProjectSnapshotsUseCase.execute({
          householdId,
          projectId: project.id,
          yearMonth,
        });
        return { project, settled: snapshots.length > 0 };
      }),
    );

    const unsettledAccounts = accountSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.account);
    const unsettledPortfolios = portfolioSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.portfolio);
    const unsettledDebts = debtSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.debt);
    const unsettledProjects = projectSettlementFlags
      .filter((result) => !result.settled)
      .map((result) => result.project);

    const totalUnsettled =
      unsettledAccounts.length +
      unsettledPortfolios.length +
      unsettledDebts.length +
      unsettledProjects.length;

    return {
      year,
      month,
      isReady: totalUnsettled === 0,
      unsettledAccounts,
      unsettledPortfolios,
      unsettledDebts,
      unsettledProjects,
      totalUnsettled,
    };
  }
}

export const getSettlementReadinessUseCase = new GetSettlementReadinessUseCase();
