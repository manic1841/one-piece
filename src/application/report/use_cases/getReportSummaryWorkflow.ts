import { householdPermissionService } from '@/application/household/householdPermissionService';
import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';

import { type FinancialAnalysisKpis } from './getFinancialAnalysisWorkflow';
import { EMPTY_KPIS, isBalanceSheet, isIncome, kpisOf, resolveAnchorReport } from './reportAnchor';

/** The landing page's four headline figures, at the analysis anchor. */
export interface ReportSummary {
  anchor: { yearMonth: string; closed: boolean } | null;
  kpis: FinancialAnalysisKpis;
}

export interface GetReportSummaryRequest {
  householdId: string;
  auth: AuthContext;
}

/**
 * 報表中心的摘要 KPI：只讀報表與財務期間，不讀 portfolio 或 snapshot，因此不付分析頁
 * 其餘六條序列的成本。錨點規則與分析頁相同（ADR-0090）。
 */
export class GetReportSummaryWorkflow {
  private readonly listPeriods = new ListFinancialPeriodsUseCase();

  async execute({ householdId, auth }: GetReportSummaryRequest): Promise<ReportSummary> {
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const [reports, periods] = await Promise.all([
      listReportsUseCase.execute({ householdId, auth }),
      this.listPeriods.execute({ householdId }),
    ]);

    const anchorReport = resolveAnchorReport(reports.filter(isBalanceSheet));
    if (anchorReport === null) {
      return { anchor: null, kpis: EMPTY_KPIS };
    }

    const closedMonths = new Set(
      periods.filter((period) => period.status === 'CLOSED').map((period) => period.yearMonth),
    );
    const anchorIncome = reports
      .filter(isIncome)
      .find((report) => report.yearMonth === anchorReport.yearMonth);

    return {
      anchor: {
        yearMonth: anchorReport.yearMonth,
        closed: closedMonths.has(anchorReport.yearMonth),
      },
      kpis: kpisOf(anchorReport, anchorIncome, closedMonths),
    };
  }
}

export const getReportSummaryWorkflow = new GetReportSummaryWorkflow();
