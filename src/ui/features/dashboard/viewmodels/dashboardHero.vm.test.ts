import { describe, expect, it } from 'vitest';

import { type DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

import { mapDashboardOverviewToHeroVM } from './dashboardHero.vm';

const buildSeries = () => {
  const points = [];
  for (let index = 0; index < 12; index += 1) {
    const date = new Date(2025, 8 + index, 1);
    points.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      netAssets: 1000000 + index * 100000,
    });
  }
  return points;
};

const buildOverview = (
  ytdBaseline?: { yearMonth: string; netWorth: number } | null,
): DashboardOverview => ({
  anchor: {
    yearMonth: '2026-08',
    netWorth: 2100000,
    netWorthSeries: buildSeries(),
    ytdBaseline:
      ytdBaseline === undefined ? { yearMonth: '2026-01', netWorth: 1000000 } : ytdBaseline,
  },
  pulse: null,
});

describe('mapDashboardOverviewToHeroVM trend data', () => {
  it('exposes the anchored series as values + month labels', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview());

    expect(vm.hasAnchor).toBe(true);
    expect(vm.trend.hasData).toBe(true);
    expect(vm.trend.values).toHaveLength(12);
    expect(vm.trend.values[0]).toBe(1000000);
    expect(vm.trend.values[11]).toBe(2100000);
    expect(vm.trend.labels[0]).toBe('SEP 2025');
    expect(vm.trend.labels[11]).toBe('AUG 2026');
  });

  it('builds one tooltip point per month with a month-over-month delta', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview());

    expect(vm.trend.points).toHaveLength(12);
    expect(vm.trend.points[0]).toEqual({
      title: 'SEP 2025',
      value: 'NT$1,000,000',
      meta: '—',
    });
    expect(vm.trend.points[11]).toEqual({
      title: 'AUG 2026',
      value: 'NT$2,100,000',
      meta: '+5.0% MoM',
    });
  });

  it('returns an empty trend without an anchor', () => {
    const vm = mapDashboardOverviewToHeroVM(null);

    expect(vm.hasAnchor).toBe(false);
    expect(vm.trend).toEqual({ values: [], labels: [], points: [], hasData: false });
  });
});

describe('mapDashboardOverviewToHeroVM ytd change', () => {
  it('formats signed percentage with YTD suffix and signed absolute amount', () => {
    const vm = mapDashboardOverviewToHeroVM(
      buildOverview({ yearMonth: '2026-01', netWorth: 2000000 }),
    );

    expect(vm.ytd).not.toBeNull();
    expect(vm.ytd?.percentText).toBe('+5.0% YTD');
    expect(vm.ytd?.amountText).toBe('+NT$100,000');
  });

  it('formats negative ytd change without a double sign', () => {
    const vm = mapDashboardOverviewToHeroVM(
      buildOverview({ yearMonth: '2026-01', netWorth: 2200000 }),
    );

    expect(vm.ytd?.percentText).toBe('-4.5% YTD');
    expect(vm.ytd?.amountText).toBe('-NT$100,000');
  });

  it('renders an em-dash when no baseline exists', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview(null));

    expect(vm.ytd).not.toBeNull();
    expect(vm.ytd?.percentText).toBe('—');
    expect(vm.ytd?.amountText).toBeNull();
  });
});
