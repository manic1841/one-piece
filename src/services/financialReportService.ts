import { type Transaction, runTransaction } from 'firebase/firestore';

import { calculateBalanceSheet } from '@/domains/finance/calculators/balanceSheetCalculator';
import { calculateCashFlowStatement } from '@/domains/finance/calculators/cashFlowCalculator';
import { reconcileReports } from '@/domains/finance/calculators/financialReportCalculator';
import { calculateIncomeStatement } from '@/domains/finance/calculators/incomeStatementCalculator';
import {
  calculateClosingBalance,
  calculateDividends,
} from '@/domains/finance/logic/financialLogic';
import {
  aggregateCashFlows,
  aggregateIncomeStatements,
  aggregateLatestBalanceSheet,
} from '@/domains/finance/logic/reportAggregation';
import { EquitySubCategory, type FinancialReport, ReportType } from '@/domains/finance/types';
import { db } from '@/firebase';
import { reportRepository } from '@/repositories/reportRepository';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
  type Project,
} from '@/schemas';
import { accountService } from '@/services/accountService';
import { plannedIncomeService } from '@/services/plannedIncomeService';
import { type ProjectWithSnapshot, projectService } from '@/services/projectService';
import { settlementService } from '@/services/settlementService';
import { logger } from '@/utils/logger';

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
    const unsettled = await settlementService.getUnsettledStats(householdId, year, month);
    if (unsettled.totalUnsettled > 0) {
      const missing = [
        ...unsettled.unsettledProjects.map((p) => `專案 [${p.name}]`),
        ...unsettled.unsettledAccounts.map((a) => `帳戶 [${a.name}]`),
        ...unsettled.unsettledPortfolios.map((p) => `投資組合 [${p.name}]`),
      ].join('、');
      throw new Error(`無法產生報表：尚有項目未建立 ${year}/${month} 快照 (${missing})`);
    }
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
    auth: AuthContext,
  ): Promise<void> {
    // 1. Fetch data needed for closing OUTSIDE the transaction because it uses queries
    // queries (like list/getProjects) are not supported inside transactions
    const incomeStatement = reports.find((r) => r.type === ReportType.INCOME_STATEMENT);
    const incomeStatementData = incomeStatement?.data as IncomeStatementData;
    let closingData = null;

    if (incomeStatement && 'netIncome' in incomeStatementData) {
      closingData = await this.getClosingData(
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
        await this.executeClosing(
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

  async closeMonth(
    householdId: string,
    year: number,
    month: number,
    userId: string,
    userEmail: string,
    auth: AuthContext,
    providedNetIncome?: number,
    tx?: Transaction,
  ): Promise<void> {
    // This is the public API. We must ensure reads happen before writes.
    // However, the queries (getProjects) cannot be part of the transaction easily.

    let netIncome = providedNetIncome;
    if (netIncome === undefined) {
      const reports = await this.generateFinancialReports(householdId, year, month, userId);
      if (
        reports.incomeStatement.type !== ReportType.INCOME_STATEMENT ||
        !('netIncome' in reports.incomeStatement.data)
      ) {
        throw new Error('Invalid income statement data');
      }
      netIncome = reports.incomeStatement.data.netIncome;
    }

    const data = await this.getClosingData(householdId, year, month);

    const execute = async (t: Transaction) => {
      await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin, t);
      await this.executeClosing(
        householdId,
        year,
        month,
        userEmail,
        auth,
        netIncome!,
        data.dividends,
        data.retainedEarningsProject,
        t,
      );
    };

    if (tx) {
      await execute(tx);
    } else {
      await runTransaction(db, (t) => execute(t));
    }
  }

  /**
   * Internal helper to fetch data for closing (contains queries, call outside tx)
   */
  private async getClosingData(householdId: string, year: number, month: number) {
    const allProjects = await projectService.getProjects(householdId);
    const projectsWithSnapshots = await Promise.all(
      allProjects.map((p: Project) =>
        projectService.getProjectWithSnapshot(householdId, p.id, year, month),
      ),
    );

    const dividends = calculateDividends(projectsWithSnapshots);
    const retainedEarningsProject = projectsWithSnapshots.find(
      (p) => p.accounting?.balanceSheet?.subcategory === EquitySubCategory.RETAINED_EARNINGS,
    );

    if (!retainedEarningsProject) {
      throw new Error('Retained Earnings project not found');
    }

    return { dividends, retainedEarningsProject };
  }

  /**
   * Internal helper to execute closing writes (READs then WRITEs)
   */
  private async executeClosing(
    householdId: string,
    year: number,
    month: number,
    userEmail: string,
    auth: AuthContext,
    netIncome: number,
    dividends: number,
    retainedEarningsProject: ProjectWithSnapshot,
    tx: Transaction,
  ) {
    logger.info(`executeClosing: ${year}-${month}`, 'FinancialReportService');

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    // READ phase
    const prevSnapshot = await projectService.getSnapshotForPeriod(
      householdId,
      retainedEarningsProject.id,
      prevYear,
      prevMonth,
      tx,
    );
    const openingBalance = prevSnapshot?.closingBalance || 0;

    // WRITE phase
    const closingBalance = calculateClosingBalance(openingBalance, netIncome, dividends);
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
        auth,
        tx,
      );
    } else {
      await projectService.recordSnapshot(
        householdId,
        retainedEarningsProject.id,
        snapshotData,
        userEmail,
        auth,
        tx,
      );
    }
  }
}

export const financialReportService = new FinancialReportService();
