import { type IncomeStatement } from '../schemas';
import { projectService } from './projectService';
import { transactionService } from './transactionService';
import { plannedIncomeService } from './plannedIncomeService';
// import { accountingConfigService } from './accountingConfigService';
import { calculateIncomeStatement } from '../domains/finance/calculators/incomeStatementCalculator';

/**
 * Service for generating and managing income statements
 */
class IncomeStatementService {
  /**
   * Generate income statement for a given period
   */
  async generateIncomeStatement(
    householdId: string,
    startDate: Date,
    endDate: Date,
    createdBy: string,
  ): Promise<IncomeStatement> {
    // 1. Fetch plannedIncome for the period
    const plannedIncomes = await plannedIncomeService.getPlannedIncomesForPeriod(
      householdId,
      startDate,
      endDate,
    );

    // 2. Fetch income transactions (extra income)
    // Convert dates to string YYYY-MM-DD for transaction query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const incomeTransactions = await transactionService.getTransactions(householdId, {
      startDate: startDateStr,
      endDate: endDateStr,
      type: 'income',
    });

    // 3. Fetch project snapshots for expenses
    const projects = await projectService.getProjects(householdId);
    const snapshots = await projectService.getSnapshotsForPeriod(
      householdId,
      startDate.getFullYear(),
      endDate.getFullYear(),
    );

    // 4. Fetch accounting configuration - No longer needed for expense calculation
    // const accountingConfig = await accountingConfigService.getConfig(householdId);

    // 5. Calculate income statement using pure function
    return calculateIncomeStatement(
      plannedIncomes,
      incomeTransactions,
      snapshots,
      projects,
      startDate,
      endDate,
      createdBy,
      householdId,
    );
  }
}

export const incomeStatementService = new IncomeStatementService();
