import { type ProjectionOpeningPeriod } from '@/application/retirement/workflows/listProjectionOpeningPeriods';
import { type ReportValue } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { formatCurrency } from '@/ui/utils';

/** A picker row: the value a pick applies plus its display form. */
export interface OpeningPeriodVM extends ReportValue {
  amountDisplay: string;
}

/**
 * UI boundary for a candidate month. Amounts are whole NT dollars everywhere
 * else in the workspace, so rounding and formatting happen here once instead of
 * in the render loop.
 */
export const mapOpeningPeriodToVM = (period: ProjectionOpeningPeriod): OpeningPeriodVM => {
  const amount = Math.round(period.netWorth);
  return {
    anchorYearMonth: period.yearMonth,
    amountText: String(amount),
    amountDisplay: formatCurrency(amount),
  };
};

export const mapOpeningPeriodsToVM = (periods: ProjectionOpeningPeriod[]): OpeningPeriodVM[] =>
  periods.map(mapOpeningPeriodToVM);
