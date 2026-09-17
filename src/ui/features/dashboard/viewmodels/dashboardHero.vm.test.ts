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

const buildOverview = (ytdBaseline?: { yearMonth: string; netWorth: number } | null): DashboardOverview => ({
  anchor: {
    yearMonth: '2026-08',
    netWorth: 2100000,
    netWorthSeries: buildSeries(),
    ytdBaseline: ytdBaseline === undefined ? { yearMonth: '2026-01', netWorth: 1000000 } : ytdBaseline,
  },
  pulse: null,
});

describe('mapDashboardOverviewToHeroVM trend geometry', () => {
  it('builds axis labels and path for the anchored series', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview());

    expect(vm.hasAnchor).toBe(true);
    expect(vm.trend.path).toMatch(/^M/);
    expect(vm.trend.areaPath).toMatch(/Z$/);
    expect(vm.trend.endPoint).toBeDefined();

    expect(vm.trend.xLabels).toHaveLength(4);
    expect(vm.trend.xLabels[0].text).toBe('SEP 2025');
    expect(vm.trend.xLabels[1].text).toBe('JAN 2026');
    expect(vm.trend.xLabels[2].text).toBe('MAY 2026');
    expect(vm.trend.xLabels[3].text).toBe('AUG 2026');
    expect(vm.trend.xLabels[0].x).toBeLessThan(vm.trend.xLabels[1].x);
    expect(vm.trend.xLabels[1].x).toBeLessThan(vm.trend.xLabels[2].x);
    expect(vm.trend.xLabels[2].x).toBeLessThan(vm.trend.xLabels[3].x);

    expect(vm.trend.yLabels).toHaveLength(4);
    expect(vm.trend.yLabels[0].text).toBe('0');
    expect(vm.trend.yLabels[3].text).toBe('2.1M');
  });

  it('returns empty trend geometry without an anchor', () => {
    const vm = mapDashboardOverviewToHeroVM(null);

    expect(vm.hasAnchor).toBe(false);
    expect(vm.trend.path).toBeUndefined();
    expect(vm.trend.xLabels).toHaveLength(0);
    expect(vm.trend.yLabels).toHaveLength(0);
    expect(vm.trend.endPoint).toBeUndefined();
  });
});

describe('mapDashboardOverviewToHeroVM ytd change', () => {
  it('formats signed percentage with YTD suffix and signed absolute amount', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview({ yearMonth: '2026-01', netWorth: 2000000 }));

    expect(vm.ytd).not.toBeNull();
    expect(vm.ytd?.percentText).toBe('+5.0% YTD');
    expect(vm.ytd?.amountText).toBe('+$100,000');
  });

  it('formats negative ytd change without a double sign', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview({ yearMonth: '2026-01', netWorth: 2200000 }));

    expect(vm.ytd?.percentText).toBe('-4.5% YTD');
    expect(vm.ytd?.amountText).toBe('-$100,000');
  });

  it('renders an em-dash when no baseline exists', () => {
    const vm = mapDashboardOverviewToHeroVM(buildOverview(null));

    expect(vm.ytd).not.toBeNull();
    expect(vm.ytd?.percentText).toBe('—');
    expect(vm.ytd?.amountText).toBeNull();
  });
});
