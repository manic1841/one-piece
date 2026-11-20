import {
  type FinancialPeriod,
  type FinancialPeriodStatus,
} from '@/domains/financial_period/schemas';
import { PERIOD_STATUS_TEXT } from '@/ui/constants/monthlyClose';

/** How many months back the picker's matrix reaches, current month included. */
export const CLOSE_MONTH_MATRIX_SIZE = 6;

/** A month's status is the period's own status; no record is the only extra case. */
export type CloseMonthStatus = FinancialPeriodStatus | 'NOT_STARTED';

export interface CloseMonthVM {
  yearMonth: string;
  /** Short cell label, e.g. "9 月". */
  monthText: string;
  status: CloseMonthStatus;
  statusText: string;
}

const statusOf = (yearMonth: string, periods: FinancialPeriod[]): CloseMonthStatus =>
  periods.find((period) => period.yearMonth === yearMonth)?.status ?? 'NOT_STARTED';

/**
 * The last six months ending at `anchor` (a `YYYY-MM`), newest last, with the
 * status each month already has. A month without a period record is still a
 * candidate: picking it is how one gets created.
 */
export const buildCloseMonthMatrix = (
  anchor: string,
  periods: FinancialPeriod[],
): CloseMonthVM[] => {
  const anchorYear = Number(anchor.slice(0, 4));
  const anchorMonth = Number(anchor.slice(5, 7));

  return Array.from({ length: CLOSE_MONTH_MATRIX_SIZE }, (_, index) => {
    const offset = index - (CLOSE_MONTH_MATRIX_SIZE - 1);
    // Date normalizes the month arithmetic (month 0 rolls back into the prior year).
    const date = new Date(anchorYear, anchorMonth - 1 + offset, 1);
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const status = statusOf(yearMonth, periods);

    return {
      yearMonth,
      monthText: `${date.getMonth() + 1} 月`,
      status,
      statusText: PERIOD_STATUS_TEXT[status],
    };
  });
};
