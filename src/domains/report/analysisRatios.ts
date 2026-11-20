/**
 * The analysis page's ratios, as pure value functions so the workflow, the roll-up
 * and the ViewModel all compute them once. Behaviour contract:
 * docs/financial_analysis.md §3（儲蓄率）與 §8（報酬率）、§9（負債比）。
 */

/** `(income - expense) / income × 100`; null without positive income. Negative rates are valid. */
export const savingsRateOf = (income: number, expense: number): number | null =>
  income > 0 ? ((income - expense) / income) * 100 : null;

/** `gain / openingValue × 100`; null when the opening value is not positive. */
export const returnRateOf = (gain: number, openingValue: number): number | null =>
  openingValue > 0 ? (gain / openingValue) * 100 : null;

/** `liabilities / assetsTotal × 100`; null when total assets are not positive. */
export const debtRatioOf = (liabilities: number, assetsTotal: number): number | null =>
  assetsTotal > 0 ? (liabilities / assetsTotal) * 100 : null;

/**
 * Change against the previous period, in percent of its magnitude, so the sign
 * survives a negative base. Null when either side is missing or the base is 0.
 */
export const changeRateOf = (previous: number | null, current: number | null): number | null =>
  previous === null || current === null || previous === 0
    ? null
    : ((current - previous) / Math.abs(previous)) * 100;
