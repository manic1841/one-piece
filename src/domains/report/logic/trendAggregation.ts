import { type TrendDataPoint } from '../types';

export type AssetTrendViewMode = 'month' | 'quarter' | 'year';

export interface AssetTrendData {
  labels: string[];
  incomes: number[];
  expenses: number[];
  investmentGains: number[];
  assets: number[];
  liabilities: number[];
  netAssets: number[];
  investmentReturnRates: (number | null)[];
}

/**
 * Aggregates monthly trend points into the specified view mode.
 *
 * Aggregation logic:
 * - Flow metrics (income, expense, investmentGains) are SUMMED for the period.
 * - Point-in-time metrics (assets) take the LAST recorded value of the period.
 *
 * @param points Raw monthly trend data points (assumed sorted by date)
 * @param mode Target view mode (month, quarter, year)
 */
export function aggregateTrendPoints(
  points: TrendDataPoint[],
  mode: AssetTrendViewMode,
): AssetTrendData {
  const result: AssetTrendData = {
    labels: [],
    incomes: [],
    expenses: [],
    investmentGains: [],
    assets: [],
    liabilities: [],
    netAssets: [],
    investmentReturnRates: [],
  };

  if (points.length === 0) return result;

  // Use an object as a map to preserve grouping and order
  const groupMap: Record<
    string,
    {
      income: number;
      expense: number;
      investmentGain: number;
      totalAssets: number;
      liabilities: number;
      netAssets: number;
      investmentReturnRate: number | null;
    }
  > = {};
  const labels: string[] = [];

  points.forEach((p) => {
    let label = '';
    if (mode === 'month') {
      label = `${p.year}-${String(p.month).padStart(2, '0')}`;
    } else if (mode === 'quarter') {
      const q = Math.floor((p.month - 1) / 3) + 1;
      label = `${p.year}-Q${q}`;
    } else {
      label = `${p.year}`;
    }

    if (!groupMap[label]) {
      groupMap[label] = {
        income: p.income || 0,
        expense: p.expense || 0,
        investmentGain: p.investmentGain || 0,
        totalAssets: p.totalAssets || 0,
        liabilities: p.liabilities || 0,
        netAssets: p.netAssets || 0,
        investmentReturnRate: p.investmentReturnRate ?? null,
      };
      labels.push(label);
    } else {
      const group = groupMap[label];
      group.income += p.income || 0;
      group.expense += p.expense || 0;
      group.investmentGain += p.investmentGain || 0;

      // Points are assumed sorted, so taking the current one updates the "latest" balance
      if (p.totalAssets !== null) {
        group.totalAssets = p.totalAssets;
      }
      if (p.liabilities !== null) {
        group.liabilities = p.liabilities;
      }
      if (p.netAssets !== null) {
        group.netAssets = p.netAssets;
      }
      if (p.investmentReturnRate !== null) {
        group.investmentReturnRate = p.investmentReturnRate;
      }
    }
  });

  // Convert map to result arrays
  labels.forEach((label) => {
    const group = groupMap[label];
    result.labels.push(label);
    result.incomes.push(group.income);
    result.expenses.push(group.expense);
    result.investmentGains.push(group.investmentGain);
    result.assets.push(group.totalAssets);
    result.liabilities.push(group.liabilities);
    result.netAssets.push(group.netAssets);
    result.investmentReturnRates.push(group.investmentReturnRate);
  });

  return result;
}
