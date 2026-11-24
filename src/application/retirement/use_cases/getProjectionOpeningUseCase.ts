import { householdPermissionService } from '@/application/household/householdPermissionService';
import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import {
  balanceSheetsByMonth,
  netWorthOf,
  newestMonthFirst,
} from '@/application/retirement/workflows/openingNetWorth';
import { type AuthContext } from '@/application/types';

export interface ProjectionOpeningResult {
  openingNetWorth: number;
  anchorYearMonth: string;
  assets: number;
  liabilities: number;
}

export interface ProjectionOpeningUnavailable {
  reason: 'NO_CLOSED_PERIOD';
}

export type ProjectionOpeningLookup = ProjectionOpeningResult | ProjectionOpeningUnavailable;

interface GetProjectionOpeningRequest {
  householdId: string;
  auth: AuthContext;
}

/**
 * Resolves the projection's derived opening net worth from the latest CLOSED
 * period's stored balance sheet. Net worth has one calculation path:
 * assets.total - liabilities.total from the report.
 */
export class GetProjectionOpeningUseCase {
  async execute(request: GetProjectionOpeningRequest): Promise<ProjectionOpeningLookup> {
    const { householdId, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const reports = await listReportsUseCase.execute({ householdId, auth });
    const byMonth = balanceSheetsByMonth(reports);
    const months = [...byMonth.keys()].sort(newestMonthFirst);

    const getFinancialPeriod = new GetFinancialPeriodUseCase();
    // One read per candidate period; parallel so a household with a long report
    // history does not pay a serial round trip per month.
    const statuses = await Promise.all(
      months.map((yearMonth) => getFinancialPeriod.execute({ householdId, yearMonth })),
    );

    const closedIndex = statuses.findIndex((period) => period?.status === 'CLOSED');
    if (closedIndex === -1) return { reason: 'NO_CLOSED_PERIOD' };

    const report = byMonth.get(months[closedIndex] as string);
    if (report === undefined) return { reason: 'NO_CLOSED_PERIOD' };

    return {
      openingNetWorth: netWorthOf(report),
      anchorYearMonth: report.yearMonth,
      assets: report.data.assets.total,
      liabilities: report.data.liabilities.total,
    };
  }
}

export const getProjectionOpeningUseCase = new GetProjectionOpeningUseCase();
