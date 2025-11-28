import { accountService } from './accountService';
import { projectService } from './projectService';

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

    // Get all accounts
    const accounts = await accountService.getAccounts(householdId);

    // Get balance snapshots for current and previous month
    const currentSnapshots = new Map<string, number>();
    const previousSnapshots = new Map<string, number>();

    for (const account of accounts) {
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

    // Calculate total balances from account snapshots
    let currentTotalBalance = 0;
    let previousTotalBalance = 0;

    for (const balance of currentSnapshots.values()) {
      currentTotalBalance += balance;
    }
    for (const balance of previousSnapshots.values()) {
      previousTotalBalance += balance;
    }

    const actualChange = currentTotalBalance - previousTotalBalance;

    // Get all projects
    const projects = await projectService.getProjects(householdId);

    // Get project snapshots for the month
    const incomeByProject: Record<string, number> = {};
    const expenseByProject: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    for (const project of projects) {
      const projectSnapshots = await projectService.getSnapshots(
        householdId,
        project.id,
        year,
        month,
      );

      if (projectSnapshots.length > 0) {
        const snapshot = projectSnapshots[0];

        if (snapshot.income > 0) {
          incomeByProject[project.id] = snapshot.income;
          totalIncome += snapshot.income;
        }

        if (snapshot.expense > 0) {
          expenseByProject[project.id] = snapshot.expense;
          totalExpense += snapshot.expense;
        }
      }
    }

    const expectedChange = totalIncome - totalExpense;

    // Calculate discrepancy
    const discrepancy = actualChange - expectedChange;
    const discrepancyPercentage =
      previousTotalBalance > 0 ? (discrepancy / previousTotalBalance) * 100 : 0;

    return {
      year,
      month,
      previousMonth: {
        year: prevYear,
        month: prevMonth,
        totalBalance: previousTotalBalance,
      },
      currentMonth: {
        year,
        month,
        totalBalance: currentTotalBalance,
      },
      actualChange,
      expected: {
        totalIncome,
        totalExpense,
        incomeByProject,
        expenseByProject,
      },
      expectedChange,
      discrepancy,
      discrepancyPercentage,
      hasDiscrepancy: Math.abs(discrepancy) > 0.01,
    };
  },
};
