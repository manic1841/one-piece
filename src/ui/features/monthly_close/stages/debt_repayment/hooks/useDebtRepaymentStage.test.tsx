import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';

import { useDebtRepaymentStage } from './useDebtRepaymentStage';

vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn() },
}));

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

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
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.repayments).toHaveLength(1));
    expect(result.current.repayments[0]?.totalPayment).toBe(12_000);
  });

  it('re-seeds the draft for the new month when the workspace remounts (#250)', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockImplementation(async ({ month }) => ({
      items: [
        {
          debtAccountId: 'debt-1',
          debtAccountName: '房貸',
          openingBalance: 1_000_000,
          hasRepaymentRecord: true,
          repaymentCount: 1,
          repaymentAmount: month === 8 ? 15_000 : 20_000,
          hasSnapshot: true,
          willCreateSnapshot: false,
        },
      ],
    }));

    const debtAccounts = [debtAccount('debt-1')];

    const renderFor = (month: string) =>
      renderHook(() =>
        useDebtRepaymentStage({
          householdId: 'household-1',
          selectedYearMonth: month,
          debtAccounts,
          confirmingStageId: null,
        }),
      );

    const august = renderFor('2026-08');
    await waitFor(() => expect(august.result.current.repayments?.[0]?.totalPayment).toBe(15_000));
    august.unmount();

    const { result } = renderFor('2026-09');

    await waitFor(() => expect(result.current.repayments?.[0]?.totalPayment).toBe(20_000));
  });

  // The prefill seeds once (#250): an edit is owned, later loads leave it alone.
  it('never overwrites an edited repayment on a same-month reload (#250)', async () => {
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
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.repayments).toHaveLength(1));

    act(() => {
      result.current.setRepayments([
        { debtAccountId: 'debt-1', totalPayment: 8_000, date: new Date('2026-08-05') },
      ]);
    });
    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.repayments?.[0]?.totalPayment).toBe(8_000);
  });

  // A failed prefill surfaces the canned copy and leaves the draft unknown (#231).
  it('reports a load failure without blocking a hand-typed draft or leaking a rejection', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockRejectedValue(new Error('boom'));
    // Hoisted: a fresh array per render would change `load`'s identity and loop.
    const debtAccounts = [debtAccount('debt-1')];

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        debtAccounts,
        confirmingStageId: null,
      }),
    );

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入債務還款試算，請稍後再試。'),
    );
    expect(result.current.repayments).toBeNull();

    const draft = [{ debtAccountId: 'debt-1', totalPayment: 8_000, date: new Date('2026-08-05') }];
    act(() => {
      result.current.setRepayments(draft);
    });
    expect(result.current.buildRequest()).toEqual({
      stageId: 'DEBT_REPAYMENT',
      repayments: draft,
    });

    // The failed load settles instead of escaping as an unhandled rejection.
    await act(async () => {
      await expect(result.current.refresh?.()).resolves.toBeUndefined();
    });
  });

  // An empty month is "nothing to read", not "read the previous month" (#250).
  it('issues no prefill read and stays unseeded while the month is empty', async () => {
    const debtAccounts = [debtAccount('debt-1')];

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        householdId: 'household-1',
        selectedYearMonth: '',
        debtAccounts,
        confirmingStageId: null,
      }),
    );

    await act(async () => {});

    expect(previewDebtSettlementsUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.repayments).toBeNull();
    expect(result.current.debtSectionMetas).toEqual([]);
  });
});
