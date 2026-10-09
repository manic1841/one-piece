import { type AuthContext } from '@/application/types';
import { RoleEnum } from '@/domains/household/role';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { intentMappingRepository } from '@/infra/repositories/intentMappingRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { retirementRepository } from '@/infra/repositories/retirementRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { HouseholdBackupPayloadSchema } from './backupSchema';
import { type HouseholdBackupPayload } from './exportHouseholdBackupUseCase';
import {
  type ExistingHouseholdData,
  buildDeleteRefs,
  buildSetOps,
  commitDeletes,
  commitSets,
} from './householdBackupRestoreOps';

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

class ImportHouseholdBackupUseCase {
  /**
   * Validates the payload and returns the parsed form. The schema's timestamp
   * type revives ISO strings back to Date here, so callers must write the
   * returned value rather than the raw request payload.
   */
  private validateBackup(backup: HouseholdBackupPayload): HouseholdBackupPayload {
    if (!backup || backup.schemaVersion !== 1) {
      throw new Error('Invalid backup file: unsupported schema version');
    }

    if (!backup.household || !backup.collections) {
      throw new Error('Invalid backup file: missing required fields');
    }

    const result = HouseholdBackupPayloadSchema.safeParse(backup);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first ? first.path.join('.') : '(unknown)';
      throw new Error(`Invalid backup file: payload failed validation at ${path}`);
    }

    return result.data;
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
      financialPeriods,
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
      financialPeriodRepository.listAll(householdId),
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
      financialPeriods,
    };
  }

  async execute(request: ImportHouseholdBackupRequest): Promise<RestoreOperationSummary> {
    const { householdId, auth, backup } = request;

    if (!householdId) throw new Error('householdId is required');
    if (!auth.uid) throw new Error('User must be authenticated');

    const revivedBackup = this.validateBackup(backup);
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
    const includedCollections = new Set(
      Object.entries(backup.collections)
        .filter(([, value]) => Array.isArray(value))
        .map(([key]) => key),
    );
    const deleteRefs = await buildDeleteRefs(householdId, existingData, includedCollections);
    const setOps = buildSetOps(householdId, revivedBackup);
    // CONTRACT: Deletes commit before writes. If the write phase fails
    // partway, existing data is already deleted — the household will be
    // in a partially restored state. Validation runs before any deletes,
    // so malformed payloads never cause data loss.
    await commitDeletes(deleteRefs);
    await commitSets(setOps);

    return {
      deletedDocuments: deleteRefs.length,
      restoredDocuments: setOps.length,
    };
  }
}

export const importHouseholdBackupUseCase = new ImportHouseholdBackupUseCase();
