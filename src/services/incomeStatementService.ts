import {
  type IncomeStatement,
} from '../schemas';
import { transactionService } from './transactionService';
import { projectService } from './projectService';
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
    // 1. Fetch transactions for the period
    const transactions = await transactionService.getTransactionsByPeriod(
      householdId,
      startDate,
      endDate,
    );

    // 2. Fetch projects for accounting configuration
    const projects = await projectService.getProjects(householdId);

    // 3. Calculate income statement using pure function
    return calculateIncomeStatement(
      transactions,
      projects,
      startDate,
      endDate,
      createdBy,
      householdId
    );
  }
}

export const incomeStatementService = new IncomeStatementService();
