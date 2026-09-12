import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
  ReportType,
} from '@/domains/report/schemas';
import {
  aggregateBalanceSheetSnapshots,
  aggregateCashFlowSnapshots,
  aggregateIncomeStatementSnapshots,
  buildYearMonthKeys,
} from '@/domains/report/reportSnapshotAggregation';
import { reportRepository } from '@/infra/repositories/reportRepository';

export type StoredReportKind = 'incomeStatement' | 'balanceSheet' | 'cashFlow';

export interface GetStoredReportRequest {
  householdId: string;
  yearMonth: string;
  kind: StoredReportKind;
  auth: AuthContext;
}

export type StoredReportData = IncomeStatementData | BalanceSheetData | CashFlowData;

export class GetStoredReportUseCase {
  async execute(request: GetStoredReportRequest): Promise<StoredReportData | null> {
    const { householdId, yearMonth, kind, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    switch (kind) {
      case 'incomeStatement':
        return this.getStoredIncomeStatement(householdId, yearMonth);
      case 'balanceSheet':
        return this.getStoredBalanceSheet(householdId, yearMonth);
      case 'cashFlow':
        return this.getStoredCashFlow(householdId, yearMonth);
    }
  }

  private async getStoredIncomeStatement(
    householdId: string,
    yearMonth: string,
  ): Promise<IncomeStatementData | null> {
    if (yearMonth.length === 4) {
      const monthlyReports = (await this.fetchMonthlyReports(
        householdId,
        yearMonth,
        ReportType.INCOME_STATEMENT,
      )) as IncomeStatementData[];
      if (monthlyReports.length === 0) return null;
      return aggregateIncomeStatementSnapshots(yearMonth, monthlyReports);
    }

    const report = await reportRepository.getReport(
      householdId,
      yearMonth,
      ReportType.INCOME_STATEMENT,
    );
    return report ? (report.data as IncomeStatementData) : null;
  }

  private async getStoredBalanceSheet(
    householdId: string,
    yearMonth: string,
  ): Promise<BalanceSheetData | null> {
    if (yearMonth.length === 4) {
      const monthlyReports = (await this.fetchMonthlyReports(
        householdId,
        yearMonth,
        ReportType.BALANCE_SHEET,
      )) as BalanceSheetData[];
      const decemberKey = yearMonth + '-12';
      const hasDecember = monthlyReports.some((r) => r.yearMonth === decemberKey);
      if (!hasDecember || monthlyReports.length === 0) return null;
      return aggregateBalanceSheetSnapshots(yearMonth, monthlyReports);
    }

    const report = await reportRepository.getReport(
      householdId,
      yearMonth,
      ReportType.BALANCE_SHEET,
    );
    return report ? (report.data as BalanceSheetData) : null;
  }

  private async getStoredCashFlow(
    householdId: string,
    yearMonth: string,
  ): Promise<CashFlowData | null> {
    if (yearMonth.length === 4) {
      const monthlyReports = (await this.fetchMonthlyReports(
        householdId,
        yearMonth,
        ReportType.CASH_FLOW,
      )) as CashFlowData[];
      if (monthlyReports.length === 0) return null;
      return aggregateCashFlowSnapshots(yearMonth, monthlyReports);
    }

    const report = await reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW);
    return report ? (report.data as CashFlowData) : null;
  }

  private async fetchMonthlyReports(
    householdId: string,
    yearMonth: string,
    type: ReportType,
  ): Promise<unknown[]> {
    const reports = await Promise.all(
      buildYearMonthKeys(yearMonth).map(async (monthKey) => {
        const report = await reportRepository.getReport(householdId, monthKey, type);
        return report ? report.data : null;
      }),
    );
    return reports.filter((r): r is NonNullable<typeof r> => r !== null);
  }
}

export const getStoredReportUseCase = new GetStoredReportUseCase();
