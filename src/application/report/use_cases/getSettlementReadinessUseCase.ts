import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type Project } from '@/domains/project/schemas';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

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
        const snapshot = await accountSnapshotRepository.getSnapshot(
          householdId,
          account.id,
          yearMonth,
        );
        return { account, settled: snapshot !== null };
      }),
    );

    const portfolioSettlementFlags = await Promise.all(
      activePortfolios.map(async (portfolio) => {
        const snapshot = await portfolioSnapshotRepository.getSnapshot(
          householdId,
          portfolio.id,
          yearMonth,
        );
        return { portfolio, settled: snapshot !== null };
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
        const snapshot = await projectSnapshotRepository.getSnapshot(
          householdId,
          project.id,
          yearMonth,
        );
        return { project, settled: snapshot !== null };
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
