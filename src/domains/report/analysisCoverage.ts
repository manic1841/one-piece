import { monthCode } from './analysisScale';

interface CoverageWindow {
  /** Mean expense of the month and the two before it; null when any of them is missing. */
  expenseAverage: number | null;
  /** `cash ÷ expenseAverage`; null when the window is incomplete or the average is not positive. */
  coverageMonths: number | null;
}

/**
 * 現金覆蓋的近三月 window：當月與前兩期。window 內缺任一期就沒有值，不以「有幾期算幾期」
 * 補償（見 docs/financial_analysis.md §10）；window 可由選取範圍外補齊，範圍只決定顯示軸。
 */
export const cashCoverageOf = (
  cash: number,
  yearMonth: string,
  expenseByMonth: ReadonlyMap<number, number>,
): CoverageWindow => {
  const codes = [0, 1, 2].map((back) => monthCode(yearMonth) - back);
  if (!codes.every((code) => expenseByMonth.has(code))) {
    return { expenseAverage: null, coverageMonths: null };
  }
  const expenseAverage =
    codes.reduce((sum, code) => sum + (expenseByMonth.get(code) ?? 0), 0) / codes.length;
  return {
    expenseAverage,
    coverageMonths: expenseAverage > 0 ? cash / expenseAverage : null,
  };
};
