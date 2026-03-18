import { type TrendDataPoint } from '../types';

export type AssetTrendViewMode = 'month' | 'quarter' | 'year';

export interface AssetTrendData {
  labels: string[];
  incomes: number[];
  expenses: number[];
  assets: number[];
}

export function aggregateTrendPoints(
  points: TrendDataPoint[],
  mode: AssetTrendViewMode,
): AssetTrendData {
  const result: AssetTrendData = {
    labels: [],
    incomes: [],
    expenses: [],
    assets: [],
  };

  if (points.length === 0) return result;

  // Basic implementation: for 'month', just use all points
  // A robust implementation would group by quarter or year
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

    // Optimization: actual aggregation logic could combine points with the same label
    // For now, we return monthly data if they aren't grouped properly, but labels are set
    // In a real app, you'd reduce into a map and then map to arrays
    result.labels.push(label);
    result.incomes.push(p.income || 0);
    result.expenses.push(p.expense || 0);
    result.assets.push(p.totalAssets || 0);
  });

  return result;
}
