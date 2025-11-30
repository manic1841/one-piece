import type { CashFlowStatement } from '../schemas/cashFlow';
import { transactionService } from './transactionService';
import { projectService } from './projectService';
import { accountService } from './accountService';
import { calculateCashFlow } from '../domains/finance/calculators/cashFlowCalculator';

/**
 * Service for generating and managing cash flow statements
 */
class CashFlowService {
  /**
   * Generate cash flow statement for a given period
   */
  async generateCashFlowStatement(
    householdId: string,
    startDate: Date,
    endDate: Date,
    createdBy: string,
  ): Promise<CashFlowStatement> {
    // 1. Fetch transactions for the period
    const transactions = await transactionService.getTransactionsByPeriod(
      householdId,
      startDate,
      endDate,
    );

    // 2. Fetch projects for accounting configuration
    const projects = await projectService.getProjects(householdId);

    // 3. Calculate beginning balance (sum of cash/bank accounts at start date)
    // This is an approximation. Ideally, we'd use snapshots.
    // For now, let's try to get snapshots for the previous month end.
    const prevMonthEnd = new Date(startDate);
    prevMonthEnd.setDate(0); // Last day of previous month
    
    const accounts = await accountService.getAccounts(householdId);
    let beginningBalance = 0;
    
    // Try to get snapshots for previous month
    for (const account of accounts) {
      if (account.type === 'bank' || account.type === 'cash') {
        const snapshots = await accountService.getSnapshots(
          householdId,
          account.id,
          prevMonthEnd.getFullYear(),
          prevMonthEnd.getMonth() + 1
        );
        
        if (snapshots.length > 0) {
          beginningBalance += snapshots[0].amount;
        } else {
          // Fallback: If no snapshot, maybe use current balance - transactions in period?
          // Or just 0 if we can't determine.
          // For MVP, let's assume 0 if no snapshot, or maybe we can implement a better way later.
          // Actually, let's try to fetch the *latest* snapshot before startDate if possible.
          // But getSnapshots is by year/month.
        }
      }
    }

    // 4. Calculate cash flow using pure function
    return calculateCashFlow(
      transactions,
      projects,
      startDate,
      endDate,
      beginningBalance,
      createdBy,
      householdId
    );
  }
}

export const cashFlowService = new CashFlowService();
