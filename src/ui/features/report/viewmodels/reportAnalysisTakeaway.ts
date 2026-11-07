import { changeRateOf } from '@/domains/report/analysisRatios';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { formatPercentage } from '@/ui/utils';

import {
  type DebtLeverageChartVM,
  type IncomeChartVM,
  type NetWorthChartVM,
} from './reportAnalysis.vm';

interface Points {
  netWorthPoints: NetWorthChartVM[];
  incomePoints: IncomeChartVM[];
  debtLeveragePoints: DebtLeverageChartVM[];
}

/** The lead is split so the page can give the headline figure its own size. */
export interface TakeawayVM {
  before: string;
  value: string;
  after: string;
}

const indexAt = (points: readonly { yearMonth: string }[], yearMonth: string | null): number =>
  yearMonth === null ? -1 : points.findIndex((point) => point.yearMonth === yearMonth);

/**
 * The page's answer, before any chart: what happened to net worth and the two
 * ratios that explain it. Falls back to the empty copy without an anchor.
 */
export const takeawayOf = (points: Points, anchor: string | null): TakeawayVM => {
  const index = indexAt(points.netWorthPoints, anchor);
  const latest = index < 0 ? undefined : points.netWorthPoints[index];
  if (latest === undefined) {
    return { before: '', value: REPORT_ANALYSIS_LABELS.EMPTY_DESCRIPTION, after: '' };
  }
  const parts: string[] = [];
  const previous = points.netWorthPoints[index - 1];
  const rate = previous === undefined ? null : changeRateOf(previous.netWorth, latest.netWorth);
  if (rate !== null) {
    const sign = rate >= 0 ? '+' : '';
    parts.push(REPORT_ANALYSIS_LABELS.TAKEAWAY_DELTA(`${sign}${formatPercentage(rate, 1)}`));
  }
  const income = points.incomePoints[indexAt(points.incomePoints, anchor)];
  if (income !== undefined && income.savingsRate !== null) {
    parts.push(REPORT_ANALYSIS_LABELS.TAKEAWAY_SAVINGS_RATE(income.savingsRateText));
  }
  const debt = points.debtLeveragePoints[indexAt(points.debtLeveragePoints, anchor)];
  if (debt !== undefined && debt.debtRatio !== null) {
    parts.push(REPORT_ANALYSIS_LABELS.TAKEAWAY_DEBT_RATIO(debt.debtRatioText));
  }
  const after =
    parts.length === 0
      ? ''
      : `${REPORT_ANALYSIS_LABELS.TAKEAWAY_SEPARATOR}${parts.join(REPORT_ANALYSIS_LABELS.TAKEAWAY_SEPARATOR)}。`;
  return { before: REPORT_ANALYSIS_LABELS.TAKEAWAY_NET_WORTH, value: latest.netWorthText, after };
};
