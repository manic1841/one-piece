import { describe, expect, it } from 'vitest';

import {
  type DashboardOverview,
  type DashboardPulse,
} from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

import { mapDashboardOverviewToPulseVM } from './dashboardPulse.vm';

const buildOverview = (pulse: DashboardPulse | null): DashboardOverview => ({
  anchor: null,
  pulse,
});

describe('dashboardPulse.vm', () => {
  it('maps the four pulse metrics with labels and formats', () => {
    const vm = mapDashboardOverviewToPulseVM(
      buildOverview({
        netCashFlow: -12300,
        investmentReturn: 3.913,
        investmentLeverage: 1.2,
        monthlyDebtPayment: 13500,
        investmentGain: 3000,
      }),
    );

    expect(vm.metrics).toHaveLength(4);

    const [netCashFlow, investmentReturn, investmentLeverage, monthlyDebtPayment] = vm.metrics;

    expect(netCashFlow.label).toBe('淨現金流');
    expect(netCashFlow.valueText).toBe('-$12,300');
    expect(netCashFlow.valueClassName).toBe('text-negative');

    expect(investmentReturn.label).toBe('投資報酬率');
    expect(investmentReturn.valueText).toBe('3.91%');
    expect(investmentReturn.detailText).toContain('3,000');

    expect(investmentLeverage.label).toBe('投資槓桿');
    expect(investmentLeverage.valueText).toBe('1.20x');

    expect(monthlyDebtPayment.label).toBe('本月債務還款');
    expect(monthlyDebtPayment.valueText).toContain('13,500');
  });

  it('uses em-dash for missing pulse metrics', () => {
    const vm = mapDashboardOverviewToPulseVM(
      buildOverview({
        netCashFlow: null,
        investmentReturn: null,
        investmentLeverage: null,
        monthlyDebtPayment: null,
        investmentGain: null,
      }),
    );

    expect(vm.metrics.map((metric) => metric.valueText)).toEqual(['—', '—', '—', '—']);
  });

  it('returns empty metrics when there is no pulse', () => {
    const vm = mapDashboardOverviewToPulseVM(null);

    expect(vm.metrics).toEqual([]);
  });
});
