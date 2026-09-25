import { householdPermissionService } from '@/application/household/householdPermissionService';
import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { calculateEquityTotal } from '@/domains/report/equityUtils';
import { ReportType } from '@/domains/report/schemas';

export interface StartingNetWorthResult {
  startingNetWorth: number;
  anchorYearMonth: string;
  assets: number;
  liabilities: number;
}

export interface StartingNetWorthUnavailable {
  reason: 'NO_CLOSED_PERIOD';
}

export type StartingNetWorthSource = StartingNetWorthResult | StartingNetWorthUnavailable;

/**
 * Resolves the starting net worth for a retirement projection from the latest
 * CLOSED period's stored BALANCE_SHEET report (issue #127 Q1). Net Worth has a
 * single calculation path: assets.total - liabilities.total from the report;
 * the plan does not store a savings snapshot.
 */
export const getStartingNetWorthUseCase = {
  async execute(request: {
    householdId: string;
    auth: AuthContext;
  }): Promise<StartingNetWorthSource> {
    const { householdId, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const reports = await listReportsUseCase.execute({ householdId, auth });
    const balanceSheets = reports
      .filter((report) => report.type === ReportType.BALANCE_SHEET)
      .sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : a.yearMonth > b.yearMonth ? -1 : 0));

    const getFinancialPeriod = new GetFinancialPeriodUseCase();
    for (const report of balanceSheets) {
      const period = await getFinancialPeriod.execute({
        householdId,
        yearMonth: report.yearMonth,
      });
      if (period?.status !== 'CLOSED') {
        continue;
      }
      return {
        startingNetWorth: calculateEquityTotal(report.data),
        anchorYearMonth: report.yearMonth,
        assets: report.data.assets.total,
        liabilities: report.data.liabilities.total,
      };
    }

    return { reason: 'NO_CLOSED_PERIOD' };
  },
};
