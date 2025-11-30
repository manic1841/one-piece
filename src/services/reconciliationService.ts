import { accountService } from './accountService';
import { projectService } from './projectService';
import { calculateReconciliationReport } from '../domains/finance/calculators/reconciliationCalculator';

export type ReconciliationReport = {
  year: number;
  month: number;
  previousMonth: {
    year: number;
    month: number;
    totalBalance: number;
  };
  currentMonth: {
    year: number;
    month: number;
    totalBalance: number;
  };
  actualChange: number;
  expected: {
    totalIncome: number;
    totalExpense: number;
    incomeByProject: Record<string, number>;
    expenseByProject: Record<string, number>;
  };
  expectedChange: number;
  discrepancy: number;
  discrepancyPercentage: number;
  hasDiscrepancy: boolean;
};

export const reconciliationService = {
  // Get reconciliation report for a specific month
  async getReconciliationReport(
    householdId: string,
    year: number,
    month: number,
  ): Promise<ReconciliationReport> {
    // Get previous month
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    // 1. Fetch Accounts
    const accounts = await accountService.getAccounts(householdId);
    const reconciliationAccounts = accounts.filter(
      (account) => account.includeInReconciliation !== false,
    );

    // 2. Fetch Account Snapshots (Current & Previous)
    const currentSnapshots = new Map<string, number>();
    const previousSnapshots = new Map<string, number>();

    for (const account of reconciliationAccounts) {
      const currentMonthSnapshots = await accountService.getSnapshots(
        householdId,
        account.id,
        year,
        month,
      );
      const prevMonthSnapshots = await accountService.getSnapshots(
        householdId,
        account.id,
        prevYear,
        prevMonth,
      );

      if (currentMonthSnapshots.length > 0) {
        currentSnapshots.set(account.id, currentMonthSnapshots[0].amount);
      }
      if (prevMonthSnapshots.length > 0) {
        previousSnapshots.set(account.id, prevMonthSnapshots[0].amount);
      }
    }

    // 3. Calculate Total Balances
    let currentTotalBalance = 0;
    let previousTotalBalance = 0;

    for (const balance of currentSnapshots.values()) {
      currentTotalBalance += balance;
    }
    for (const balance of previousSnapshots.values()) {
      previousTotalBalance += balance;
    }

    // 4. Fetch Projects
    const projects = await projectService.getProjects(householdId);
    const reconciliationProjects = projects.filter(
      (project) => project.includeInReconciliation !== false,
    );

    // 5. Fetch Project Snapshots
    const projectSnapshots = [];
    // Optimization: We could fetch all snapshots in parallel or batch, 
    // but for now we keep the loop to minimize change risk, just collecting data.
    // Ideally, projectService should support fetching snapshots for multiple projects or by period.
    for (const project of reconciliationProjects) {
      const snapshots = await projectService.getSnapshots(
        householdId,
        project.id,
        year,
        month,
      );
      if (snapshots.length > 0) {
        // Inject projectId into snapshot for the calculator
        projectSnapshots.push({ ...snapshots[0], projectId: project.id });
      }
    }

    // 6. Calculate Report
    return calculateReconciliationReport({
      year,
      month,
      previousTotalBalance,
      currentTotalBalance,
      projects,
      projectSnapshots,
    });
  },
};
