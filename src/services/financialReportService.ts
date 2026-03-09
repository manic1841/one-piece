import { runTransaction } from 'firebase/firestore';

import { calculateBalanceSheet } from '@/domains/finance/calculators/balanceSheetCalculator';
import { calculateCashFlowStatement } from '@/domains/finance/calculators/cashFlowCalculator';
import { reconcileReports } from '@/domains/finance/calculators/financialReportCalculator';
import { calculateIncomeStatement } from '@/domains/finance/calculators/incomeStatementCalculator';
import {
  aggregateCashFlows,
  aggregateIncomeStatements,
  aggregateLatestBalanceSheet,
} from '@/domains/finance/logic/reportAggregation';
import { type FinancialReport, ReportType } from '@/domains/finance/types';
import { db } from '@/firebase';
import { reportRepository } from '@/repositories/reportRepository';
import {
  type Account,
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
} from '@/schemas';
import { accountService } from '@/services/accountService';
import { plannedIncomeService } from '@/services/plannedIncomeService';
import { portfolioService } from '@/services/portfolioService';
import { projectService } from '@/services/projectService';
import { settlementService } from '@/services/settlementService';
import { logger } from '@/utils/logger';

import { financialClosingService } from './financialClosingService';
import { type AuthContext, householdService } from './householdService';

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

    // 0. Validate Snapshots
    await this.validateSnapshots(householdId, year, month);

    // 1. Fetch Data
    const { projectsWithSnapshots, plannedIncomes, accountSnapshots, stockGainLossData, accounts } =
      await this.fetchDataForReports(householdId, year, month);

    const beginningCash = await this.calculateBeginningCash(householdId, year, month, accounts);

    // 2. Calculate Reports
    const incomeStatementData = calculateIncomeStatement(plannedIncomes, projectsWithSnapshots);

    const balanceSheetData = calculateBalanceSheet(
      accountSnapshots,
      projectsWithSnapshots,
      incomeStatementData.netIncome,
      stockGainLossData.totalGainLoss,
    );

    const cashFlowData = calculateCashFlowStatement(
      projectsWithSnapshots,
      beginningCash,
      incomeStatementData.netIncome,
    );

    // 3. Reconcile
    const reconciliation = reconcileReports(balanceSheetData, cashFlowData);

    // 4. Construct Report Objects
    const reports = this.buildReportObjects(
      year,
      month,
      userId,
      incomeStatementData,
      balanceSheetData,
      cashFlowData,
      reconciliation,
    );

    logger.info('generateFinancialReports.end', 'FinancialReportService');

    return {
      ...reports,
      reconciliation,
    };
  }

  private async validateSnapshots(householdId: string, year: number, month: number) {
    const unsettled = await settlementService.getUnsettledStats(householdId, year, month);
    if (unsettled.totalUnsettled > 0) {
      const missing = [
        ...unsettled.unsettledProjects.map((p) => `專案 [${p.name}]`),
        ...unsettled.unsettledAccounts.map((a) => `帳戶 [${a.name}]`),
        ...unsettled.unsettledPortfolios.map((p) => `投資組合 [${p.name}]`),
      ].join('、');
      throw new Error(`無法產生報表：尚有項目未建立 ${year}/${month} 快照 (${missing})`);
    }
  }

  private async fetchDataForReports(householdId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const [allProjects, plannedIncomes, accounts] = await Promise.all([
      projectService.getProjects(householdId),
      plannedIncomeService.getPlannedIncomes(householdId, { startDate, endDate }),
      accountService.getAccounts(householdId),
    ]);

    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p) => projectService.getProjectWithSnapshot(householdId, p.id, year, month)),
    );

    const accountSnapshots = await accountService.getAccountWithSnapshots(
      householdId,
      accounts.map((a) => a.id),
      year,
      month,
    );

    const stockGainLossData = await portfolioService.getStockGainLoss(householdId, year, month);

    return { projectsWithSnapshots, plannedIncomes, accountSnapshots, stockGainLossData, accounts };
  }

  private async calculateBeginningCash(
    householdId: string,
    year: number,
    month: number,
    accounts: Account[],
  ): Promise<number> {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const prevReport = await this.getFinancialReport(
      householdId,
      ReportType.CASH_FLOW,
      prevYear,
      prevMonth,
    );

    const prevReportData = prevReport?.data as CashFlowData | undefined;

    if (prevReportData && 'endingBalance' in prevReportData) {
      logger.info(
        `Beginning cash for ${year}/${month} from prev report: ${prevReportData.endingBalance}`,
        'FinancialReportService',
      );
      return prevReportData.endingBalance;
    }

    const prevAccountSnapshots = await accountService.getAccountSnapshots(
      householdId,
      accounts.map((a) => a.id),
      prevYear,
      prevMonth,
    );
    const beginningCash = prevAccountSnapshots.reduce((sum, acc) => sum + acc.amount, 0);
    logger.info(
      `Beginning cash for ${year}/${month} from account snapshots: ${beginningCash}`,
      'FinancialReportService',
    );
    return beginningCash;
  }

  private buildReportObjects(
    year: number,
    month: number,
    userId: string,
    incomeStatementData: IncomeStatementData,
    balanceSheetData: BalanceSheetData,
    cashFlowData: CashFlowData,
    reconciliation: { reconciled: boolean; difference: number },
  ) {
    const now = new Date();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

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
      id: reportRepository.buildId(ReportType.INCOME_STATEMENT, year, month),
      type: ReportType.INCOME_STATEMENT,
      data: incomeStatementData,
      ...commonFields,
    };

    const balanceSheet: FinancialReport = {
      id: reportRepository.buildId(ReportType.BALANCE_SHEET, year, month),
      type: ReportType.BALANCE_SHEET,
      data: balanceSheetData,
      ...commonFields,
    };

    const cashFlow: FinancialReport = {
      id: reportRepository.buildId(ReportType.CASH_FLOW, year, month),
      type: ReportType.CASH_FLOW,
      data: cashFlowData,
      ...commonFields,
    };

    return { incomeStatement, balanceSheet, cashFlow };
  }

  /**
   * Save confirmed reports to Firestore
   */
  async saveFinancialReports(
    householdId: string,
    reports: FinancialReport[],
    email: string,
    auth: AuthContext,
  ): Promise<void> {
    // 1. Fetch data needed for closing OUTSIDE the transaction because it uses queries
    // queries (like list/getProjects) are not supported inside transactions
    const incomeStatement = reports.find((r) => r.type === ReportType.INCOME_STATEMENT);
    const incomeStatementData = incomeStatement?.data as IncomeStatementData;
    let closingData = null;

    if (incomeStatement && 'netIncome' in incomeStatementData) {
      closingData = await financialClosingService.getClosingData(
        householdId,
        incomeStatement.year,
        incomeStatement.month,
      );
    }

    await runTransaction(db, async (tx) => {
      // 2. Permission check (READ)
      await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin, tx);

      // 3. Perform closing writes (READs then WRITEs)
      if (closingData && incomeStatement) {
        await financialClosingService.executeClosing(
          householdId,
          incomeStatement.year,
          incomeStatement.month,
          email,
          auth,
          incomeStatementData.netIncome,
          closingData.dividends,
          closingData.retainedEarningsProject,
          tx,
        );
      }

      // 4. Save reports (WRITEs)
      for (const report of reports) {
        await reportRepository.create([householdId], report, email, tx, report.id);
      }
    });
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
}

export const financialReportService = new FinancialReportService();
