import { withReadPermission } from '@/application/common/readGuard';
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
  reason: 'NO_REPORT';
}

export type ProjectionOpeningLookup = ProjectionOpeningResult | ProjectionOpeningUnavailable;

interface GetProjectionOpeningRequest {
  householdId: string;
  auth: AuthContext;
}

/**
 * Resolves the projection's derived opening net worth from the latest stored
 * balance sheet. A month does not have to be closed: the report is the source,
 * and closing is just a later workflow gate. Net worth has one calculation
 * path: assets.total - liabilities.total from the report.
 */
export class GetProjectionOpeningUseCase {
  async execute(request: GetProjectionOpeningRequest): Promise<ProjectionOpeningLookup> {
    const { householdId, auth } = request;
    const reports = await withReadPermission(householdId, auth, () =>
      listReportsUseCase.execute({ householdId, auth, skipPermissionCheck: true }),
    );
    const byMonth = balanceSheetsByMonth(reports);
    const newest = [...byMonth.keys()].sort(newestMonthFirst)[0];
    if (newest === undefined) return { reason: 'NO_REPORT' };

    const report = byMonth.get(newest);
    if (report === undefined) return { reason: 'NO_REPORT' };

    return {
      openingNetWorth: netWorthOf(report),
      anchorYearMonth: report.yearMonth,
      assets: report.data.assets.total,
      liabilities: report.data.liabilities.total,
    };
  }
}

export const getProjectionOpeningUseCase = new GetProjectionOpeningUseCase();
