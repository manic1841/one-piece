import { describe, expect, it } from 'vitest';

import { type Transaction } from '@/domains/ledger/schemas';
import {
  mapDebtAccountToDisplayVM,
  mapDebtPaymentTransactionToHistoryVM,
} from '@/ui/features/debt/viewmodels/debtDisplay.vm';

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  date: new Date('2026-05-15T00:00:00'),
  createdBy: 'u',
  createdAt: new Date('2026-05-15T00:00:00'),
  updatedBy: 'u',
  updatedAt: new Date('2026-05-15T00:00:00'),
  intentType: 'DEBT_PAYMENT',
  entries: [
    { ledgerCode: 'liability:mortgage', debit: 1100, credit: 0 },
    { ledgerCode: 'expense:interest', debit: 100, credit: 0 },
    { ledgerCode: 'asset:cash', debit: 0, credit: 1200 },
  ],
  ...overrides,
});

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

  it('maps a repayment transaction to a history row using its description', () => {
    const vm = mapDebtPaymentTransactionToHistoryVM(
      buildTransaction({ description: '房貸 A 2026-05 還款' }),
      { linkedLedgerCode: 'liability:mortgage' },
    );

    expect(vm.descriptionText).toBe('房貸 A 2026-05 還款');
    expect(vm.principalText).toBe('$1,100');
    expect(vm.interestText).toBe('$100');
    expect(vm.totalText).toBe('$1,200');
  });

  it('falls back to the default description when the transaction has none', () => {
    const vm = mapDebtPaymentTransactionToHistoryVM(buildTransaction());

    expect(vm.descriptionText).toBe('還款');
  });
});
