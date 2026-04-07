import { type AuthContext } from '@/application/types';
import { RoleEnum } from '@/domains/auth/role';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { retirementRepository } from '@/infra/repositories/retirementRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ExportHouseholdBackupRequest {
  householdId: string;
  auth: AuthContext;
}

export interface HouseholdBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  householdId: string;
  household: unknown;
  collections: {
    accounts: Array<{
      account: unknown;
      snapshots: unknown[];
    }>;
    projects: Array<{
      project: unknown;
      snapshots: unknown[];
    }>;
    portfolios: Array<{
      portfolio: unknown;
      snapshots: unknown[];
    }>;
    debtAccounts: Array<{
      debtAccount: unknown;
      snapshots: unknown[];
    }>;
    retirementPlans: unknown[];
    transactions: unknown[];
    reports: unknown[];
    allocations: unknown[];
    allocationTemplates: unknown[];
    ledgerCodes: unknown[];
    intentMappings: unknown[];
  };
}

const isHouseholdAdminRole = (role: string | undefined) => {
  return role === RoleEnum.OWNER || role === RoleEnum.ADMIN;
};

class ExportHouseholdBackupUseCase {
  async execute(request: ExportHouseholdBackupRequest): Promise<HouseholdBackupPayload> {
    const { householdId, auth } = request;

    if (!householdId) {
      throw new Error('householdId is required');
    }

    if (!auth.uid) {
      throw new Error('User must be authenticated');
    }

    const household = await householdRepository.get([householdId]);
    if (!household) {
      throw new Error('Household not found');
    }

    const memberRole = household.members?.[auth.uid]?.role;
    if (!auth.isGlobalAdmin && !isHouseholdAdminRole(memberRole)) {
      throw new Error('Only household owner/admin can export backup');
    }

    const [
      accounts,
      projects,
      portfolios,
      debtAccounts,
      retirementPlans,
      transactions,
      reports,
      allocations,
      allocationTemplates,
      ledgerCodes,
      intentMappings,
    ] = await Promise.all([
      accountRepository.getAccounts(householdId, true),
      projectRepository.getProjects(householdId, true),
      portfolioRepository.list([householdId]),
      debtAccountRepository.getDebtAccounts(householdId, true),
      retirementRepository.getPlans(householdId),
      transactionRepository.list([householdId]),
      reportRepository.list([householdId]),
      allocationRepository.list([householdId]),
      allocationTemplateRepository.list([householdId]),
      customLedgerCodeRepository.list([householdId]),
      intentMappingRepository.list([householdId]),
    ]);

    const [accountBundle, projectBundle, portfolioBundle, debtBundle] = await Promise.all([
      Promise.all(
        accounts.map(async (account) => {
          const snapshots = await accountSnapshotRepository.list([householdId, account.id]);
          return { account, snapshots };
        }),
      ),
      Promise.all(
        projects.map(async (project) => {
          const snapshots = await projectSnapshotRepository.list([householdId, project.id]);
          return { project, snapshots };
        }),
      ),
      Promise.all(
        portfolios.map(async (portfolio) => {
          const snapshots = await portfolioSnapshotRepository.list([householdId, portfolio.id]);
          return { portfolio, snapshots };
        }),
      ),
      Promise.all(
        debtAccounts.map(async (debtAccount) => {
          const snapshots = await debtSnapshotRepository.list([householdId, debtAccount.id]);
          return { debtAccount, snapshots };
        }),
      ),
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      householdId,
      household,
      collections: {
        accounts: accountBundle,
        projects: projectBundle,
        portfolios: portfolioBundle,
        debtAccounts: debtBundle,
        retirementPlans,
        transactions,
        reports,
        allocations,
        allocationTemplates,
        ledgerCodes,
        intentMappings,
      },
    };
  }
}

export const exportHouseholdBackupUseCase = new ExportHouseholdBackupUseCase();
