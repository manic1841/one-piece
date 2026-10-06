import { describe, expect, it } from 'vitest';

import { mapCashFlowSeriesToChartVM } from './dashboardCashFlowChart.vm';

describe('dashboardCashFlowChart.vm', () => {
  it('exposes non-null months as inflow / outflow series + labels', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2025, month: 9, netCashFlow: null, cashIn: null, cashOut: null },
      { year: 2025, month: 10, netCashFlow: 1500, cashIn: 4000, cashOut: 2500 },
      { year: 2026, month: 7, netCashFlow: 3200, cashIn: 5200, cashOut: 2000 },
      { year: 2026, month: 8, netCashFlow: -12300, cashIn: 4600, cashOut: 16900 },
    ]);

    expect(vm.series).toEqual([
      { tone: 'positive', values: [4000, 5200, 4600] },
      { tone: 'negative', values: [2500, 2000, 16900] },
    ]);
    expect(vm.labels).toEqual(['OCT 2025', 'JUL 2026', 'AUG 2026']);
    expect(vm.hasData).toBe(true);
  });

  it('builds one tooltip point per month with inflow / outflow detail', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2026, month: 8, netCashFlow: -12300, cashIn: 4600, cashOut: 16900 },
    ]);

    expect(vm.points).toEqual([
      {
        title: 'AUG 2026',
        value: '現金流入 +NT$4,600',
        meta: '現金流出 −NT$16,900',
      },
    ]);
  });

  it('reports an empty series when no month has data', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2026, month: 1, netCashFlow: null, cashIn: null, cashOut: null },
      { year: 2026, month: 2, netCashFlow: null, cashIn: null, cashOut: null },
    ]);

    expect(vm.series).toEqual([
      { tone: 'positive', values: [] },
      { tone: 'negative', values: [] },
    ]);
    expect(vm.hasData).toBe(false);
    expect(vm.latestText).toBeNull();
  });

  it('summarizes the latest non-null month', () => {
    const vm = mapCashFlowSeriesToChartVM([
      { year: 2026, month: 7, netCashFlow: 3200, cashIn: 5200, cashOut: 2000 },
      { year: 2026, month: 8, netCashFlow: -12300, cashIn: 4600, cashOut: 16900 },
    ]);

    expect(vm.latestText).toBe('-NT$12,300');
    expect(vm.hasData).toBe(true);
  });
});
