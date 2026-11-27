import { withReadPermission } from '@/application/common/readGuard';
import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';

import { EMPTY_KPIS, type FinancialAnalysisKpis } from './reportAnchor';
import { resolveReportAnchorUseCase } from './resolveReportAnchorUseCase';

/** The landing page's four headline figures, at the analysis anchor. */
export interface ReportSummary {
  kpis: FinancialAnalysisKpis;
}

export interface GetReportSummaryRequest {
  householdId: string;
  auth: AuthContext;
}

/** 報表中心 landing 的四格摘要（契約見 docs/financial_analysis.md §1）。 */
export class GetReportSummaryWorkflow {
  private readonly listPeriods = new ListFinancialPeriodsUseCase();
  private readonly resolveAnchor = resolveReportAnchorUseCase;

  async execute({ householdId, auth }: GetReportSummaryRequest): Promise<ReportSummary> {
    const [reports, periods] = await withReadPermission(householdId, auth, () =>
      Promise.all([
        listReportsUseCase.execute({ householdId, auth, skipPermissionCheck: true }),
        this.listPeriods.execute({ householdId }),
      ]),
    );

    const closedMonths = new Set(
      periods.filter((period) => period.status === 'CLOSED').map((period) => period.yearMonth),
    );
    const resolved = this.resolveAnchor.execute({ reports, closedMonths });

    return { kpis: resolved === null ? EMPTY_KPIS : resolved.kpis };
  }
}

export const getReportSummaryWorkflow = new GetReportSummaryWorkflow();
