import { calculateBalanceSheet } from '@/domains/finance/calculators/balanceSheetCalculator';
import { calculateCashFlowStatement } from '@/domains/finance/calculators/cashFlowCalculator';
import { reconcileReports } from '@/domains/finance/calculators/financialReportCalculator';
import { calculateIncomeStatement } from '@/domains/finance/calculators/incomeStatementCalculator';
import {
  aggregateCashFlows,
  aggregateIncomeStatements,
  aggregateLatestBalanceSheet,
} from '@/domains/finance/logic/reportAggregation';
import {
  EquitySubCategory,
  type FinancialReport,
  FinancingSubCategory,
  ReportType,
} from '@/domains/finance/types';
import { ProjectExpenseBehavior } from '@/domains/project/types/categories';
import { reportRepository } from '@/repositories/reportRepository';
import { type BalanceSheetData, type CashFlowData, type IncomeStatementData } from '@/schemas';
import { accountService } from '@/services/accountService';
import { plannedIncomeService } from '@/services/plannedIncomeService';
import { projectService } from '@/services/projectService';
import { logger } from '@/utils/logger';

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
    logger.info('generateFinancialReports.start', 'FinancialReportService');
    // 1. Fetch Data
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const [allProjects, plannedIncomes, accounts] = await Promise.all([
      projectService.getProjects(householdId),
      plannedIncomeService.getPlannedIncomes(householdId, {
        startDate: startDate,
        endDate: endDate,
      }),
      accountService.getAccounts(householdId),
    ]);

    // Fetch Projects with Snapshots for the current month
    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p) => projectService.getProjectWithSnapshot(householdId, p.id, year, month)),
    );

    // Get account snapshots for the current month
    const accountSnapshots = await accountService.getAccountWithSnapshots(
      householdId,
      accounts.map((a) => a.id),
      year,
      month,
    );

    // For Cash Flow, we need beginning balance.
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevAccountSnapshots = await accountService.getAccountSnapshots(
      householdId,
      accounts.map((a) => a.id),
      prevYear,
      prevMonth,
    );
    const beginningCash = prevAccountSnapshots.reduce((sum, acc) => sum + acc.amount, 0);

    // 2. Calculate Reports
    const incomeStatementData = calculateIncomeStatement(plannedIncomes, projectsWithSnapshots);

    const balanceSheetData = calculateBalanceSheet(
      accountSnapshots,
      projectsWithSnapshots,
      incomeStatementData.netIncome,
    );

    const cashFlowData = calculateCashFlowStatement(
      projectsWithSnapshots,
      beginningCash,
      incomeStatementData.netIncome,
    );

    // 3. Reconcile
    const reconciliation = reconcileReports(balanceSheetData, cashFlowData);

    // 4. Construct Report Objects
    const now = new Date();
    const commonFields = {
      year,
      month,
      startDate,
      endDate,
      status: 'draft' as const,
      reconciled: reconciliation.reconciled,
      cached: false,
      generatedAt: now,
      generatedBy: userId,
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
    };

    const incomeStatement: FinancialReport = {
      id: `income_statement_${year}-${month}`,
      type: ReportType.INCOME_STATEMENT,
      data: incomeStatementData,
      ...commonFields,
    };

    const balanceSheet: FinancialReport = {
      id: `balance_sheet_${year}-${month}`,
      type: ReportType.BALANCE_SHEET,
      data: balanceSheetData,
      ...commonFields,
    };

    const cashFlow: FinancialReport = {
      id: `cash_flow_${year}-${month}`,
      type: ReportType.CASH_FLOW,
      data: cashFlowData,
      ...commonFields,
    };

    logger.info('generateFinancialReports.end', 'FinancialReportService');

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
  async saveFinancialReports(
    householdId: string,
    reports: FinancialReport[],
    email: string,
  ): Promise<void> {
    for (const report of reports) {
      reportRepository.create([householdId], report, email);
    }
  }

  /**
   * Get saved financial reports for a specific month
   */
  async getFinancialReports(
    householdId: string,
    year: number,
    month: number,
  ): Promise<{
    incomeStatement: FinancialReport | null;
    balanceSheet: FinancialReport | null;
    cashFlow: FinancialReport | null;
  }> {
    const reports = await reportRepository.list([householdId]);

    const incomeStatement =
      reports.find(
        (r) => r.type === ReportType.INCOME_STATEMENT && r.year === year && r.month === month,
      ) || null;
    const balanceSheet =
      reports.find(
        (r) => r.type === ReportType.BALANCE_SHEET && r.year === year && r.month === month,
      ) || null;
    const cashFlow =
      reports.find(
        (r) => r.type === ReportType.CASH_FLOW && r.year === year && r.month === month,
      ) || null;

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
    };
  }

  /**
   * Get a specific financial report by type, year, and month
   */
  async getFinancialReport(
    householdId: string,
    type: ReportType,
    year: number,
    month: number,
  ): Promise<FinancialReport | null> {
    const reports = await reportRepository.list([householdId]);
    return reports.find((r) => r.type === type && r.year === year && r.month === month) || null;
  }

  /**
   * Get yearly aggregated reports
   */
  async getYearlyReports(
    householdId: string,
    year: number,
  ): Promise<{
    incomeStatement: FinancialReport | null;
    balanceSheet: FinancialReport | null;
    cashFlow: FinancialReport | null;
  }> {
    const allReports = await reportRepository.list([householdId]);
    const yearlyReports = allReports.filter((r) => r.year === year);

    if (yearlyReports.length === 0) {
      return { incomeStatement: null, balanceSheet: null, cashFlow: null };
    }

    const isData = yearlyReports
      .filter((r) => r.type === ReportType.INCOME_STATEMENT)
      .sort((a, b) => a.month - b.month)
      .map((r) => r.data as IncomeStatementData);
    const bsData = yearlyReports
      .filter((r) => r.type === ReportType.BALANCE_SHEET)
      .sort((a, b) => a.month - b.month)
      .map((r) => r.data as BalanceSheetData);
    const cfData = yearlyReports
      .filter((r) => r.type === ReportType.CASH_FLOW)
      .sort((a, b) => a.month - b.month)
      .map((r) => r.data as CashFlowData);

    const now = new Date();
    const commonFields = {
      year,
      month: 12, // Represent yearly as month 12 or similar
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
      reconciled: true,
      cached: true,
      generatedAt: now,
      generatedBy: 'system',
    };

    return {
      incomeStatement:
        isData.length > 0
          ? ({
              id: `income_statement_${year}_yearly`,
              type: ReportType.INCOME_STATEMENT,
              data: aggregateIncomeStatements(isData),
              ...commonFields,
            } as FinancialReport)
          : null,
      balanceSheet:
        bsData.length > 0
          ? ({
              id: `balance_sheet_${year}_yearly`,
              type: ReportType.BALANCE_SHEET,
              data: aggregateLatestBalanceSheet(bsData),
              ...commonFields,
            } as FinancialReport)
          : null,
      cashFlow:
        cfData.length > 0
          ? ({
              id: `cash_flow_${year}_yearly`,
              type: ReportType.CASH_FLOW,
              data: aggregateCashFlows(cfData),
              ...commonFields,
            } as FinancialReport)
          : null,
    };
  }

  /**
   * Close the month: Calculate net income, dividends, and update Retained Earnings snapshot.
   */
  async closeMonth(
    householdId: string,
    year: number,
    month: number,
    userId: string,
    userEmail: string,
  ): Promise<void> {
    logger.info(`closeMonth.start: ${year}-${month}`, 'FinancialReportService');

    // 1. Get Net Income and Dividends
    // Generate draft reports to get the current month's figures
    const reports = await this.generateFinancialReports(householdId, year, month, userId);

    // Ensure we are accessing the correct data type
    if (
      reports.incomeStatement.type !== ReportType.INCOME_STATEMENT ||
      !('netIncome' in reports.incomeStatement.data)
    ) {
      throw new Error('Invalid income statement data');
    }
    const netIncome = reports.incomeStatement.data.netIncome;

    // Fetch projects with snapshots to find Retained Earnings and identify dividends
    const allProjects = await projectService.getProjects(householdId);
    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p) => projectService.getProjectWithSnapshot(householdId, p.id, year, month)),
    );

    // Dividends are the money sent back to the owner (Inflow to family, Outflow from project)
    const dividends = projectsWithSnapshots
      .filter((p) => {
        const subcategory = p.accounting?.cashFlow?.subcategory;
        const behavior = p.accounting?.flowBehavior;
        return (
          subcategory === FinancingSubCategory.OWNER_DEPOSIT ||
          behavior?.expenseAs === ProjectExpenseBehavior.OWNER_DEPOSIT
        );
      })
      .reduce((sum, p) => sum + (p.snapshot?.expense || 0), 0);

    logger.debug(
      `Closing values - NetIncome: ${netIncome}, Dividends: ${dividends}`,
      'FinancialReportService',
    );

    // 2. Find Retained Earnings Project
    const retainedEarningsProject = projectsWithSnapshots.find(
      (p) => p.accounting?.balanceSheet?.subcategory === EquitySubCategory.RETAINED_EARNINGS,
    );

    if (!retainedEarningsProject) {
      logger.error('Retained Earnings project not found for household', 'FinancialReportService');
      throw new Error('Retained Earnings project not found');
    }

    // 3. Get Beginning Balance (Closing Balance of previous month)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevSnapshot = await projectService.getSnapshotForPeriod(
      householdId,
      retainedEarningsProject.id,
      prevYear,
      prevMonth,
    );
    const openingBalance = prevSnapshot?.closingBalance || 0;

    // 4. Update Snapshot
    const closingBalance = openingBalance + netIncome - dividends;
    const snapshotData = {
      year,
      month,
      openingBalance,
      income: netIncome,
      expense: dividends,
      closingBalance,
    };

    if (retainedEarningsProject.snapshot) {
      await projectService.updateSnapshot(
        householdId,
        retainedEarningsProject.id,
        retainedEarningsProject.snapshot.id,
        snapshotData,
        userEmail,
      );
    } else {
      await projectService.recordSnapshot(
        householdId,
        retainedEarningsProject.id,
        snapshotData,
        userEmail,
      );
    }

    logger.info(`closeMonth.end: ${year}-${month} success`, 'FinancialReportService');
  }
}

export const financialReportService = new FinancialReportService();
