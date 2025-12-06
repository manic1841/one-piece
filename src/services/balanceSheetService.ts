import { calculateBalanceSheet } from '../domains/finance/calculators/balanceSheetCalculator';
import type { BalanceSheet } from '../schemas';
import { accountService } from './accountService';
import { projectService } from './projectService';

/**
 * Service for generating and managing balance sheets
 */
class BalanceSheetService {
  /**
   * Generate balance sheet as of a specific date
   */
  async generateBalanceSheet(
    householdId: string,
    asOfDate: Date,
    createdBy: string,
  ): Promise<BalanceSheet> {
    const year = asOfDate.getFullYear();
    const month = asOfDate.getMonth() + 1;

    // 1. Fetch all accounts
    const accounts = await accountService.getAccounts(householdId);

    // 2. Fetch account snapshots for the specified month
    const accountSnapshotsMap = new Map();
    for (const account of accounts) {
      const snapshots = await accountService.getSnapshots(householdId, account.id, year, month);
      // Get the first (and should be only) snapshot for this month
      accountSnapshotsMap.set(account.id, snapshots.length > 0 ? snapshots[0] : null);
    }

    // 3. Fetch all projects
    const projects = await projectService.getProjects(householdId);

    // 4. Fetch project snapshots for the specified month
    const projectSnapshotsMap = new Map();
    for (const project of projects) {
      const snapshots = await projectService.getSnapshots(householdId, project.id, {
        year,
        month,
      });
      // Get the first (and should be only) snapshot for this month
      projectSnapshotsMap.set(project.id, snapshots.length > 0 ? snapshots[0] : null);
    }

    // 5. Calculate balance sheet using pure function
    return calculateBalanceSheet(
      accounts,
      accountSnapshotsMap,
      projects,
      projectSnapshotsMap,
      asOfDate,
      createdBy,
      householdId,
    );
  }
}

export const balanceSheetService = new BalanceSheetService();
