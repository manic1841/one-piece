import { describe, expect, it } from 'vitest';

import { type DebtSnapshot } from '@/domains/debt/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import {
  mapDebtAccountToDisplayVM,
  mapDebtHistoryMonths,
  mapDebtPaymentTransactionToHistoryVM,
} from '@/ui/features/debt/viewmodels/debtDisplay.vm';

const buildSnapshot = (overrides: Partial<DebtSnapshot> = {}): DebtSnapshot =>
  ({
    id: 'snap-2026-05',
    yearMonth: '2026-05',
    openingBalance: 500000,
    principalPaid: 1100,
    interestPaid: 100,
    closingBalance: 498900,
    createdBy: 'u',
    createdAt: new Date('2026-05-31T00:00:00'),
    updatedBy: 'u',
    updatedAt: new Date('2026-05-31T00:00:00'),
    ...overrides,
  }) as DebtSnapshot;

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
    expect(vm.yearMonth).toBe('2026-05');
    expect(vm.principalText).toBe('NT$1,100');
    expect(vm.interestText).toBe('NT$100');
    expect(vm.totalText).toBe('NT$1,200');
  });

  it('falls back to the default description when the transaction has none', () => {
    const vm = mapDebtPaymentTransactionToHistoryVM(buildTransaction());

    expect(vm.descriptionText).toBe('還款');
  });

  it('merges snapshots and payments into one month-ordered history', () => {
    const payment = mapDebtPaymentTransactionToHistoryVM(
      buildTransaction({ id: 'tx-apr', date: new Date('2026-04-10T00:00:00') }),
    );

    const months = mapDebtHistoryMonths([buildSnapshot()], [payment]);

    expect(months.map((month) => month.key)).toEqual(['2026-05', '2026-04']);
    expect(months[0].closingText).toBe('NT$498,900');
    expect(months[0].payments).toHaveLength(0);
    expect(months[1].openingText).toBe('—');
    expect(months[1].payments).toHaveLength(1);
  });

  it('returns an empty history when there are no snapshots or payments', () => {
    expect(mapDebtHistoryMonths([], [])).toEqual([]);
  });
});
