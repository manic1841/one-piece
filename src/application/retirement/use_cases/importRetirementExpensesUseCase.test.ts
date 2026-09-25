import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';
import { LEDGER_PREFIX } from '@/domains/ledger/constants/ledgerCodes';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { ImportRetirementExpensesUseCase } from './importRetirementExpensesUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listByDateRange: vi.fn(),
  },
}));

const auth: AuthContext = { uid: 'u1', isGlobalAdmin: false };

const buildTransaction = (
  entries: Array<{ ledgerCode: string; debit?: number; credit?: number }>,
) => ({
  id: 'tx-1',
  entries,
});

describe('ImportRetirementExpensesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports expense entries from the previous full year, grouped by ledger code', async () => {
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      buildTransaction([
        { ledgerCode: `${LEDGER_PREFIX.EXPENSE}:food`, debit: 30_000 },
        { ledgerCode: `${LEDGER_PREFIX.EXPENSE}:food`, debit: 12_000 },
        { ledgerCode: `${LEDGER_PREFIX.EXPENSE}:transportation`, debit: 8_000 },
        { ledgerCode: 'income:salary', credit: 100_000 },
      ]),
    ] as never);

    const result = await new ImportRetirementExpensesUseCase().execute({
      householdId: 'household-1',
      auth,
    });

    expect(transactionRepository.listByDateRange).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    const food = result.find((c) => c.expenseCategory === `${LEDGER_PREFIX.EXPENSE}:food`);
    expect(food?.currentAnnual).toBe(42_000);
    expect(food?.note).toContain(String(new Date().getFullYear() - 1));
  });

  it('ignores non-expense entries and returns an empty result when none exist', async () => {
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      buildTransaction([{ ledgerCode: 'income:salary', credit: 100_000 }]),
    ] as never);

    const result = await new ImportRetirementExpensesUseCase().execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).toEqual([]);
  });
});
