import { accountService } from './accountService';
import { transactionService } from './transactionService';

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
  transactions: {
    totalIncome: number;
    totalExpenses: number;
    incomeBySource: Record<string, number>;
    expensesByProject: Record<string, number>;
  };
  calculatedChange: number;
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
      const currentMonthSnapshots = await accountService.getSnapshots(householdId, account.id, year, month);
      const prevMonthSnapshots = await accountService.getSnapshots(householdId, account.id, prevYear, prevMonth);

      if (currentMonthSnapshots.length > 0) {
        currentSnapshots.set(account.id, currentMonthSnapshots[0].amount);
      }
      if (prevMonthSnapshots.length > 0) {
        previousSnapshots.set(account.id, prevMonthSnapshots[0].amount);
      }
    }

    // Calculate total balances
    let currentTotalBalance = 0;
    let previousTotalBalance = 0;

    for (const balance of currentSnapshots.values()) {
      currentTotalBalance += balance;
    }
    for (const balance of previousSnapshots.values()) {
      previousTotalBalance += balance;
    }

    const actualChange = currentTotalBalance - previousTotalBalance;

    // Get transactions for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const transactions = await transactionService.getTransactions(householdId, {
      startDate: startDateStr,
      endDate: endDateStr,
    });

    // Calculate income and expenses
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const calculatedChange = totalIncome - totalExpenses;

    // Calculate discrepancy
    const discrepancy = actualChange - calculatedChange;
    const discrepancyPercentage =
      previousTotalBalance > 0 ? (discrepancy / previousTotalBalance) * 100 : 0;

    // Group expenses by project
    const expensesByProject: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.projectId)
      .forEach((t) => {
        const project = t.projectId!;
        expensesByProject[project] = (expensesByProject[project] || 0) + t.amount;
      });

    // Group income by category
    const incomeBySource: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const source = t.category;
        incomeBySource[source] = (incomeBySource[source] || 0) + t.amount;
      });

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
      transactions: {
        totalIncome,
        totalExpenses,
        incomeBySource,
        expensesByProject,
      },
      calculatedChange,
      discrepancy,
      discrepancyPercentage,
      hasDiscrepancy: Math.abs(discrepancy) > 0.01,
    };
  },
};
