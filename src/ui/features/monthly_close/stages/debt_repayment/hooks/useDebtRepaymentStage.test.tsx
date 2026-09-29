import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';

import { useDebtRepaymentStage } from './useDebtRepaymentStage';

vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn() },
}));

const auth = { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false };

const debtAccount = (id: string): DebtAccount =>
  ({
    id,
    name: `債務 ${id}`,
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 1_200_000,
    currentBalance: 1_000_000,
    interestRate: 2.1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2044-01-01'),
    graceEndDate: null,
    monthlyPayment: 12_000,
    linkedLedgerCode: 'LIABILITY_MORTGAGE',
    isActive: true,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedBy: 'user-1',
    updatedAt: new Date('2024-01-01'),
  }) as unknown as DebtAccount;

describe('useDebtRepaymentStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds a draft row per active debt from the preview prefill', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      items: [
        {
          debtAccountId: 'debt-1',
          debtAccountName: '房貸',
          openingBalance: 1_000_000,
          hasRepaymentRecord: true,
          repaymentCount: 1,
          repaymentAmount: 15_000,
          hasSnapshot: true,
          willCreateSnapshot: false,
        },
      ],
    });

    const debtAccounts = [debtAccount('debt-1')];

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        debtAccounts,
        auth,
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.repayments).toHaveLength(1));
    expect(result.current.repayments[0]?.debtAccountId).toBe('debt-1');
    expect(result.current.repayments[0]?.totalPayment).toBe(15_000);
    expect(result.current.buildRequest()).toEqual({
      stageId: 'DEBT_REPAYMENT',
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 15_000, date: expect.any(Date) }],
    });
  });

  it('prefills the system-calculated monthly due when the month has no payment record', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      items: [
        {
          debtAccountId: 'debt-1',
          debtAccountName: '房貸',
          openingBalance: 1_000_000,
          hasRepaymentRecord: false,
          repaymentCount: 0,
          repaymentAmount: 0,
          hasSnapshot: false,
          willCreateSnapshot: true,
        },
      ],
    });

    const debtAccounts = [debtAccount('debt-1')];

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        debtAccounts,
        auth,
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.repayments).toHaveLength(1));
    expect(result.current.repayments[0]?.totalPayment).toBe(12_000);
  });

  it('retires the draft through resetDraft on month switch', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue({
      items: [
        {
          debtAccountId: 'debt-1',
          debtAccountName: '房貸',
          openingBalance: 1_000_000,
          hasRepaymentRecord: true,
          repaymentCount: 1,
          repaymentAmount: 15_000,
          hasSnapshot: true,
          willCreateSnapshot: false,
        },
      ],
    });

    const debtAccounts = [debtAccount('debt-1')];

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        debtAccounts,
        auth,
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.repayments).toHaveLength(1));

    act(() => {
      result.current.resetDraft();
    });

    expect(result.current.repayments).toEqual([]);
    expect(result.current.debtSectionMetas).toEqual([]);
    expect(result.current.buildRequest()).toEqual({ stageId: 'DEBT_REPAYMENT', repayments: [] });
  });
});
