import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { formatCurrency, formatPercentage } from '@/ui/utils';

import {
  type DebtLeverageChartVM,
  type IncomeChartVM,
  type NetWorthChartVM,
} from './reportAnalysis.vm';

/** Net worth: the last month's stock, plus the change against the previous period. */
export const withChange = (points: NetWorthChartVM[]): NetWorthChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined || previous.netWorth === 0) return { ...point, changeText: null };
    const delta = point.netWorth - previous.netWorth;
    const rate = (delta / Math.abs(previous.netWorth)) * 100;
    const sign = delta >= 0 ? '+' : '';
    const value = `${sign}${formatCurrency(delta)}（${sign}${formatPercentage(rate, 1)}）`;
    return { ...point, changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(value) };
  });

/** Savings change against the previous period, as an amount. */
export const withSavingsChange = (points: IncomeChartVM[]): IncomeChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined) return { ...point, changeText: null };
    const delta = point.income - point.expense - (previous.income - previous.expense);
    const sign = delta >= 0 ? '+' : '';
    return {
      ...point,
      changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(`${sign}${formatCurrency(delta)}`),
    };
  });

/** Debt-ratio change is in percentage points, not a growth rate. */
export const withRatioChange = (points: DebtLeverageChartVM[]): DebtLeverageChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined || previous.debtRatio === null || point.debtRatio === null) {
      return { ...point, changeText: null };
    }
    const delta = point.debtRatio - previous.debtRatio;
    const sign = delta >= 0 ? '+' : '';
    return {
      ...point,
      changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(
        `${sign}${delta.toFixed(1)} ${REPORT_ANALYSIS_LABELS.PERCENTAGE_POINT}`,
      ),
    };
  });
