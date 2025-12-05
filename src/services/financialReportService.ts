import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  calculateBalanceSheet,
  calculateCashFlowStatement,
  calculateIncomeStatement,
  reconcileReports,
} from '../domains/finance/calculators/financialReportCalculator';
import type { FinancialReport } from '../schemas/report';
import type { AccountSnapshot } from '../schemas/account';
import { accountService } from './accountService';
import { plannedIncomeService } from './plannedIncomeService';
import { projectService } from './projectService';
import { transactionService } from './transactionService';

class FinancialReportService {
  /**
   * Generate Financial Reports for a specific month
   */
  async generateFinancialReports(
    householdId: string,
    year: number,
    month: number,
    userId: string,
  ): Promise<{
    incomeStatement: FinancialReport;
    balanceSheet: FinancialReport;
    cashFlow: FinancialReport;
    reconciliation: { reconciled: boolean; difference: number };
  }> {
    // 1. Fetch Data
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const [allProjects, plannedIncomes, transactions, accounts] = await Promise.all([
      projectService.getProjects(householdId),
      plannedIncomeService.getPlannedIncomes(householdId, {
        startDate: startDate,
        endDate: endDate,
      }),
      transactionService.getTransactions(householdId, { startDate: startDate, endDate: endDate }),
      accountService.getAccounts(householdId),
    ]);

    // Fetch Projects with Snapshots for the current month
    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p) => projectService.getProjectWithSnapshot(householdId, p.id, year, month)),
    );

    // We need account snapshots for the current month
    // Note: accountService might not have a direct method for this, we might need to query directly or add to service.
    // Assuming we can query subcollections.
    // For now, let's implement a helper here or assume accountService has it.
    // Let's query manually here if service doesn't have it, but ideally service should.
    // Checking accountService... it doesn't seem to have getSnapshots exposed widely in previous context.
    // I'll implement a local helper to fetch account snapshots.
    const accountSnapshots = await this.getAccountSnapshots(
      householdId,
      accounts.map((a) => a.id),
      year,
      month,
    );

    // Filter Transactions for Other Income
    // Type = 'income', Category != 'salary' and != 'bonus' (case insensitive)
    const otherIncomeTransactions = transactions.filter((t) => {
      if (t.type !== 'income') return false;
      const cat = t.category.toLowerCase();
      return cat !== 'salary' && cat !== 'bonus';
    });

    // 2. Calculate Reports
    const incomeStatementData = calculateIncomeStatement(
      plannedIncomes,
      otherIncomeTransactions,
      projectsWithSnapshots,
    );

    const balanceSheetData = calculateBalanceSheet(accountSnapshots, projectsWithSnapshots);

    // For Cash Flow, we need beginning balance.
    // Beginning Balance = Previous Month's Ending Balance of Cash & Equivalents.
    // Or simpler: Current Month's Opening Balance of Cash Accounts?
    // AccountSnapshot has 'amount' which is closing balance.
    // We need previous month's account snapshots.
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevAccountSnapshots = await this.getAccountSnapshots(
      householdId,
      accounts.map((a) => a.id),
      prevYear,
      prevMonth,
    );
    const beginningCash = prevAccountSnapshots.reduce((sum, acc) => sum + acc.amount, 0);

    const cashFlowData = calculateCashFlowStatement(projectsWithSnapshots, beginningCash);

    // 3. Reconcile
    const reconciliation = reconcileReports(balanceSheetData, cashFlowData);

    // 4. Construct Report Objects
    const commonFields = {
      year,
      month,
      startDate: startTimestamp,
      endDate: endTimestamp,
      status: 'draft' as const,
      reconciled: reconciliation.reconciled,
      cached: false,
      generatedAt: Timestamp.now(),
      generatedBy: userId,
      updatedAt: Timestamp.now(),
    };

    const incomeStatement: FinancialReport = {
      id: `income_statement_${year}-${month}`,
      type: 'income_statement',
      data: incomeStatementData,
      ...commonFields,
    };

    const balanceSheet: FinancialReport = {
      id: `balance_sheet_${year}-${month}`,
      type: 'balance_sheet',
      data: balanceSheetData,
      ...commonFields,
    };

    const cashFlow: FinancialReport = {
      id: `cash_flow_${year}-${month}`,
      type: 'cash_flow',
      data: cashFlowData,
      ...commonFields,
    };

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
      reconciliation,
    };
  }

  /**
   * Save confirmed reports to Firestore
   */
  async saveFinancialReports(householdId: string, reports: FinancialReport[]): Promise<void> {
    for (const report of reports) {
      const reportRef = doc(db, 'households', householdId, 'reports', report.id);
      // Update status to confirmed
      const confirmedReport = {
        ...report,
        status: 'confirmed',
        updatedAt: Timestamp.now(),
      };
      await setDoc(reportRef, confirmedReport);
    }
  }

  // Helper to get account snapshots
  private async getAccountSnapshots(
    householdId: string,
    accountIds: string[],
    year: number,
    month: number,
  ) {
    const snapshots: AccountSnapshot[] = [];
    for (const accountId of accountIds) {
      const snapshotsRef = collection(
        db,
        'households',
        householdId,
        'accounts',
        accountId,
        'snapshots',
      );
      const q = query(snapshotsRef, where('year', '==', year), where('month', '==', month));
      const snapshotDocs = await getDocs(q);
      snapshotDocs.forEach((doc) => {
        snapshots.push({ ...doc.data(), id: accountId } as unknown as AccountSnapshot);
      });
    }
    return snapshots;
  }
}

export const financialReportService = new FinancialReportService();
