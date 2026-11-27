import { withReadPermission } from '@/application/common/readGuard';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';

import { balanceSheetsByMonth, netWorthOf, newestMonthFirst } from './openingNetWorth';

/** The picker never lists more than this many months. */
export const OPENING_PERIOD_LIMIT = 12;

export interface ProjectionOpeningPeriod {
  yearMonth: string;
  /** Net worth of that month's balance sheet; the value a pick applies. */
  netWorth: number;
}

interface ListProjectionOpeningPeriodsRequest {
  householdId: string;
  auth: AuthContext;
  /** The month currently annotating the field; returned as `pinned` when it falls outside the window. */
  anchorYearMonth?: string | null;
}

export interface ProjectionOpeningPeriods {
  /** Offerable months, newest first, at most `OPENING_PERIOD_LIMIT`. */
  periods: ProjectionOpeningPeriod[];
  /** The current anchor when the window no longer holds it, so it stays reselectable. */
  pinned: ProjectionOpeningPeriod | null;
}

/**
 * The months the opening picker offers: every month with a stored balance
 * sheet, newest first, at most `OPENING_PERIOD_LIMIT`. A month does not have to
 * be closed — the report is the source and closing is just a later gate — so an
 * open month is offerable too; the dialog says its report can still change.
 */
export class ListProjectionOpeningPeriods {
  async execute(request: ListProjectionOpeningPeriodsRequest): Promise<ProjectionOpeningPeriods> {
    const { householdId, auth, anchorYearMonth = null } = request;
    const reports = await withReadPermission(householdId, auth, () =>
      listReportsUseCase.execute({ householdId, auth, skipPermissionCheck: true }),
    );
    const byMonth = balanceSheetsByMonth(reports);
    const months = [...byMonth.keys()].sort(newestMonthFirst);

    if (months.length === 0) return { periods: [], pinned: null };

    const toPeriod = (yearMonth: string): ProjectionOpeningPeriod[] => {
      const report = byMonth.get(yearMonth);
      return report === undefined ? [] : [{ yearMonth, netWorth: netWorthOf(report) }];
    };

    const rows = months.flatMap(toPeriod).slice(0, OPENING_PERIOD_LIMIT);
    const pinned =
      anchorYearMonth !== null && !rows.some((row) => row.yearMonth === anchorYearMonth)
        ? (toPeriod(anchorYearMonth)[0] ?? null)
        : null;

    return { periods: rows, pinned };
  }
}

export const listProjectionOpeningPeriods = new ListProjectionOpeningPeriods();
