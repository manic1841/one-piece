import { describe, expect, it } from 'vitest';

import { mapDebtSummaryToCardVM, mapLeverageStatsToCardVM } from './dashboardDisplay.vm';

describe('dashboardDisplay.vm', () => {
  it('maps leverage stats to card vm', () => {
    const vm = mapLeverageStatsToCardVM({
      ratio: 1.2,
      totalExposure: 123456,
      totalNetValue: 100000,
    });

    expect(vm.ratioText).toBe('1.20x');
    expect(vm.totalExposureText).toContain('123,456');
    expect(vm.totalNetValueText).toContain('100,000');
    expect(vm.statusColorClass).toBe('text-warning');
    expect(vm.progressColorClass).toBe('bg-warning');
  });

  it('maps debt summary to card vm', () => {
    const vm = mapDebtSummaryToCardVM(200000, 12000, 2);

    expect(vm.totalDebtText).toContain('200,000');
    expect(vm.monthlyPaymentText).toContain('12,000');
    expect(vm.unpaidCountText).toBe('2');
    expect(vm.isUnpaid).toBe(true);
    expect(vm.unpaidContainerClassName).toContain('bg-negative/10');
  });
});
