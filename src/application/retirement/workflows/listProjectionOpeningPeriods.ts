import { withReadPermission } from '@/application/common/readGuard';
import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
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
 * The months the opening picker offers: CLOSED periods with a stored balance
 * sheet, newest first, at most `OPENING_PERIOD_LIMIT`. Only closed months are
 * listed because a persisted report is frozen at close (ADR-0069) — an open
 * month's report can be regenerated under the picker.
 *
 * The balance sheet condition is applied *before* the cap, otherwise a couple of
 * report-less recent months would eat slots and the window would under-fill.
 */
export class ListProjectionOpeningPeriods {
  private readonly listPeriods = new ListFinancialPeriodsUseCase();

  async execute(request: ListProjectionOpeningPeriodsRequest): Promise<ProjectionOpeningPeriods> {
    const { householdId, auth, anchorYearMonth = null } = request;
    const [periods, reports] = await withReadPermission(householdId, auth, () =>
      Promise.all([
        this.listPeriods.execute({ householdId }),
        listReportsUseCase.execute({ householdId, auth, skipPermissionCheck: true }),
      ]),
    );
    const closed = periods
      .filter((period) => period.status === 'CLOSED')
      .map((period) => period.yearMonth)
      .sort(newestMonthFirst);

    if (closed.length === 0) return { periods: [], pinned: null };

    const byMonth = balanceSheetsByMonth(reports);
    const toPeriod = (yearMonth: string): ProjectionOpeningPeriod[] => {
      const report = byMonth.get(yearMonth);
      return report === undefined ? [] : [{ yearMonth, netWorth: netWorthOf(report) }];
    };

    const rows = closed.flatMap(toPeriod).slice(0, OPENING_PERIOD_LIMIT);
    const pinned =
      anchorYearMonth !== null && !rows.some((row) => row.yearMonth === anchorYearMonth)
        ? (toPeriod(anchorYearMonth)[0] ?? null)
        : null;

    return { periods: rows, pinned };
  }
}

export const listProjectionOpeningPeriods = new ListProjectionOpeningPeriods();
