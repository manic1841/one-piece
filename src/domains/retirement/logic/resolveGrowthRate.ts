/**
 * Single engine seam for growth-rate defaults (issue #127 Q11):
 * undefined -> plan inflationRate, 0 -> explicit no growth, >0 -> specified.
 * Income, expense and event phases must not implement their own default logic.
 */
export const resolveGrowthRate = (
  itemGrowthRate: number | undefined,
  planInflationRate: number,
): number => itemGrowthRate ?? planInflationRate;
