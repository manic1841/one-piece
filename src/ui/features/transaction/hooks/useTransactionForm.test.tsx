import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionForm } from './useTransactionForm';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'user@example.com' },
    userProfile: { email: 'user@example.com', householdId: 'household-1' },
    isAdmin: true,
  }),
}));

vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({ codes: [], loading: false }),
}));

vi.mock('@/application/debt/use_cases/createDebtPaymentUseCase', () => ({
  createDebtPaymentUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/debt/use_cases/updateDebtAccountUseCase', () => ({
  updateDebtAccountUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/createTransactionWithAllocationUseCase', () => ({
  createTransactionWithAllocationUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/createTransactionUseCase', () => ({
  createTransactionUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/getIncomeAllocationTemplateUseCase', () => ({
  getIncomeAllocationTemplateUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/updateTransactionUseCase', () => ({
  updateTransactionUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/upsertIncomeAllocationTemplateUseCase', () => ({
  upsertIncomeAllocationTemplateUseCase: { execute: vi.fn() },
}));

const output = {
  intentType: 'INCOME' as const,
  intent: 'SALARY',
  date: '2026-09-02',
  amount: 10000,
  ledgerCode: 'income:salary:charles',
  description: 'September salary',
  triggerAllocation: true,
  allocationDirection: 'INCOME' as const,
  allocationItems: [{ projectId: 'project-1', percentage: 100 }],
};

describe('useTransactionForm allocation submission', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('allocation-key-1');

    const { listDebtAccountsUseCase } = await import(
      '@/application/debt/use_cases/listDebtAccountsUseCase'
    );
    const { createTransactionWithAllocationUseCase } = await import(
      '@/application/ledger/use_cases/createTransactionWithAllocationUseCase'
    );

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(createTransactionWithAllocationUseCase.execute).mockResolvedValue({
      transactionId: 'transaction-1',
      allocationId: 'transaction-1',
    });
  });

  it('reuses the key for an unchanged retry and creates a new key after the payload changes', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      '@/application/ledger/use_cases/createTransactionWithAllocationUseCase'
    );
    vi.mocked(createTransactionWithAllocationUseCase.execute)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ transactionId: 'transaction-1', allocationId: 'transaction-1' })
      .mockResolvedValueOnce({ transactionId: 'transaction-2', allocationId: 'transaction-2' });
    vi.mocked(globalThis.crypto.randomUUID)
      .mockReturnValueOnce('allocation-key-1')
      .mockReturnValueOnce('allocation-key-2');

    const { result } = renderHook(() =>
      useTransactionForm('household-1', vi.fn(), vi.fn()),
    );

    await act(async () => {
      await result.current.handleSubmit(output);
    });
    await act(async () => {
      await result.current.handleSubmit(output);
    });
    await act(async () => {
      await result.current.handleSubmit({ ...output, amount: 11000 });
    });

    const calls = vi.mocked(createTransactionWithAllocationUseCase.execute).mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[0]?.[0].idempotencyKey).toBe('allocation-key-1');
    expect(calls[1]?.[0].idempotencyKey).toBe('allocation-key-1');
    expect(calls[2]?.[0].idempotencyKey).toBe('allocation-key-2');
  });

  it('keeps the ordinary transaction command for submissions without allocation', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      '@/application/ledger/use_cases/createTransactionWithAllocationUseCase'
    );
    const { createTransactionUseCase } = await import(
      '@/application/ledger/use_cases/createTransactionUseCase'
    );
    const { result } = renderHook(() =>
      useTransactionForm('household-1', vi.fn(), vi.fn()),
    );

    await act(async () => {
      await result.current.handleSubmit({
        ...output,
        triggerAllocation: false,
        allocationDirection: undefined,
        allocationItems: undefined,
      });
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createTransactionWithAllocationUseCase.execute).not.toHaveBeenCalled();
  });
});