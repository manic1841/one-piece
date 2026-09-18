import { describe, expect, it } from 'vitest';

import { mapCashFlowSeriesToChartVM } from './dashboardCashFlowChart.vm';

describe('dashboardCashFlowChart.vm', () => {
  it('builds a 12-point line with zero baseline and month labels', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2025, month: 9, netCashFlow: null },
      { year: 2025, month: 10, netCashFlow: 1500 },
      { year: 2025, month: 11, netCashFlow: -800 },
      { year: 2025, month: 12, netCashFlow: null },
      { year: 2026, month: 1, netCashFlow: null },
      { year: 2026, month: 2, netCashFlow: null },
      { year: 2026, month: 3, netCashFlow: null },
      { year: 2026, month: 4, netCashFlow: null },
      { year: 2026, month: 5, netCashFlow: null },
      { year: 2026, month: 6, netCashFlow: null },
      { year: 2026, month: 7, netCashFlow: 3200 },
      { year: 2026, month: 8, netCashFlow: -12300 },
    ]);

    expect(vm.points).toHaveLength(12);
    expect(vm.points[0]).toMatchObject({ label: 'SEP 2025', value: null, y: 64 });
    expect(vm.points[1]).toMatchObject({ label: 'OCT 2025', value: 1500 });
    expect(vm.points[11]).toMatchObject({ label: 'AUG 2026', value: -12300 });
    expect(vm.zeroY).toBe(64);
    expect(vm.path).toContain('L');
  });

  it('renders an empty state when no month has data', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2026, month: 1, netCashFlow: null },
      { year: 2026, month: 2, netCashFlow: null },
      { year: 2026, month: 3, netCashFlow: null },
    ]);

    expect(vm.points.map((point) => point.value)).toEqual([null, null, null]);
    expect(vm.path).toBeUndefined();
    expect(vm.hasData).toBe(false);
  });

  it('summarizes the latest non-null month', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2026, month: 7, netCashFlow: 3200 },
      { year: 2026, month: 8, netCashFlow: -12300 },
    ]);

    expect(vm.latest).toMatchObject({ label: 'AUG 2026', value: -12300 });
    expect(vm.latestText).toBe('-$12,300');
    expect(vm.hasData).toBe(true);
  });
});
