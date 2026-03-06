import { type AssetTrendData, type TrendDataPoint } from '../types';

/**
 * Aggregates monthly trend points into the requested view mode (month, season, year).
 */
export function aggregateTrendPoints(
  monthlyPoints: TrendDataPoint[],
  viewMode: 'month' | 'season' | 'year' = 'month',
): AssetTrendData {
  if (viewMode === 'month') {
    return {
      points: monthlyPoints.map((p) => ({
        ...p,
        label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      })),
    };
  }

  if (viewMode === 'season') {
    const seasonalPoints: TrendDataPoint[] = [];
    // Group by year and quarter
    const quarters = new Map<string, TrendDataPoint[]>();
    monthlyPoints.forEach((p) => {
      const q = Math.floor((p.month - 1) / 3) + 1;
      const key = `${p.year}-Q${q}`;
      if (!quarters.has(key)) quarters.set(key, []);
      quarters.get(key)!.push(p);
    });

    quarters.forEach((points, key) => {
      const [yearStr, qStr] = key.split('-');
      const year = parseInt(yearStr);
      seasonalPoints.push({
        year,
        month: (parseInt(qStr.substring(1)) - 1) * 3 + 1,
        label: `${year} ${qStr}`,
        income: points.reduce((sum, p) => (p.income !== null ? sum + p.income : sum), 0),
        expense: points.reduce((sum, p) => (p.expense !== null ? sum + p.expense : sum), 0),
        totalAssets: points[points.length - 1].totalAssets, // Use latest asset value in quarter
        investmentGain: points.reduce((sum, p) => sum + (p.investmentGain ?? 0), 0),
      });
    });
    return { points: seasonalPoints };
  }

  if (viewMode === 'year') {
    const yearlyPoints: TrendDataPoint[] = [];
    const years = new Map<number, TrendDataPoint[]>();
    monthlyPoints.forEach((p) => {
      if (!years.has(p.year)) years.set(p.year, []);
      years.get(p.year)!.push(p);
    });

    years.forEach((points, year) => {
      yearlyPoints.push({
        year,
        month: 1,
        label: `${year}`,
        income: points.reduce((sum, p) => (p.income !== null ? sum + p.income : sum), 0),
        expense: points.reduce((sum, p) => (p.expense !== null ? sum + p.expense : sum), 0),
        totalAssets: points[points.length - 1].totalAssets, // Use latest asset value in year
        investmentGain: points.reduce((sum, p) => sum + (p.investmentGain ?? 0), 0),
      });
    });
    return { points: yearlyPoints };
  }

  return { points: monthlyPoints };
}
