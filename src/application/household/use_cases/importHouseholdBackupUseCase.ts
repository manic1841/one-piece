import { type AuthContext } from '@/application/types';
import { RoleEnum } from '@/domains/auth/role';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { retirementRepository } from '@/infra/repositories/retirementRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { type HouseholdBackupPayload } from './exportHouseholdBackupUseCase';
import {
  type ExistingHouseholdData,
  buildDeleteRefs,
  buildSetOps,
  commitDeletes,
  commitSets,
  isRecord,
} from './householdBackupRestoreOps';

const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export interface ImportHouseholdBackupRequest {
  householdId: string;
  auth: AuthContext;
  backup: HouseholdBackupPayload;
}

interface RestoreOperationSummary {
  deletedDocuments: number;
  restoredDocuments: number;
}

const isHouseholdAdminRole = (role: string | undefined) => {
  return role === RoleEnum.OWNER || role === RoleEnum.ADMIN;
};

const reviveDates = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (typeof value === 'string' && ISO_DATE_TIME_RE.test(value)) return new Date(value);

  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, val]) => {
      out[key] = reviveDates(val);
    });
    return out;
  }

  return value;
};

class ImportHouseholdBackupUseCase {
  private validateBackup(backup: HouseholdBackupPayload): void {
    if (!backup || backup.schemaVersion !== 1) {
      throw new Error('Invalid backup file: unsupported schema version');
    }

    if (!backup.household || !backup.collections) {
      throw new Error('Invalid backup file: missing required fields');
    }
  }

  private async loadExistingData(householdId: string): Promise<ExistingHouseholdData> {
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

    return {
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
    };
  }

  async execute(request: ImportHouseholdBackupRequest): Promise<RestoreOperationSummary> {
    const { householdId, auth, backup } = request;

    if (!householdId) throw new Error('householdId is required');
    if (!auth.uid) throw new Error('User must be authenticated');

    this.validateBackup(backup);
    if (backup.householdId !== householdId) {
      throw new Error('Backup household does not match current household');
    }

    const household = await householdRepository.get([householdId]);
    if (!household) throw new Error('Household not found');

    const memberRole = household.members?.[auth.uid]?.role;
    if (!auth.isGlobalAdmin && !isHouseholdAdminRole(memberRole)) {
      throw new Error('Only household owner/admin can restore backup');
    }

    const existingData = await this.loadExistingData(householdId);
    const deleteRefs = await buildDeleteRefs(householdId, existingData);
    const backupData = reviveDates(backup) as HouseholdBackupPayload;
    const setOps = buildSetOps(householdId, backupData);

    await commitDeletes(deleteRefs);
    await commitSets(setOps);

    return {
      deletedDocuments: deleteRefs.length,
      restoredDocuments: setOps.length,
    };
  }
}

export const importHouseholdBackupUseCase = new ImportHouseholdBackupUseCase();
