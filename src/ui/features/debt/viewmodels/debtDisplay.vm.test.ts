import { describe, expect, it } from 'vitest';

import { mapDebtAccountToDisplayVM } from '@/ui/features/debt/viewmodels/debtDisplay.vm';

describe('debtDisplay.vm', () => {
  it('maps debt account to display vm with computed fields', () => {
    const vm = mapDebtAccountToDisplayVM(
      {
        id: 'debt-1',
        name: '房貸 A',
        type: 'mortgage',
        repaymentType: 'equal_payment',
        originalAmount: 1000000,
        currentBalance: 800000,
        interestRate: 2,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2056-01-01'),
        graceEndDate: null,
        monthlyPayment: 25000,
        linkedLedgerCode: 'liability:mortgage',
        linkedProjectId: 'project-1',
        note: undefined,
        isActive: true,
        createdBy: 'u',
        updatedBy: 'u',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      '購屋專案',
    );

    expect(vm.projectName).toBe('購屋專案');
    expect(vm.typeLabel).toBe('房貸');
    expect(vm.repaidPercent).toBe(20);
    expect(vm.monthlyDueAmount).toBe(25000);
    expect(vm.inGracePeriod).toBe(false);
    expect(vm.payoffDate).not.toBeNull();
  });
});
