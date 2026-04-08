import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

vi.mock('@/ui/features/debt/hooks/useDebtAccountForm', () => ({
  useDebtAccountForm: vi.fn(),
}));

vi.mock('@/ui/features/debt/hooks/useDebtAccountCmds', () => ({
  useDebtAccountCmds: vi.fn(),
}));

const validValues = {
  name: '房貸 A',
  type: 'mortgage',
  repaymentType: 'equal_payment',
  originalAmount: '1000000',
  currentBalance: '900000',
  interestRate: '2.2',
  startDate: '2026-01-01',
  endDate: '2056-01-01',
  graceEndDate: '',
  disbursementDate: '2026-01-01',
  disbursementDescription: '房貸撥款',
  monthlyPayment: '25000',
  linkedProjectId: '',
  note: '',
} as const;

describe('useDebtAccountFormViewModel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useDebtAccountForm } = await import('@/ui/features/debt/hooks/useDebtAccountForm');
    const { useDebtAccountCmds } = await import('@/ui/features/debt/hooks/useDebtAccountCmds');

    vi.mocked(useDebtAccountForm).mockReturnValue({
      values: { ...validValues },
      calcResult: null,
      isManualPayment: false,
      isCreateMode: true,
      errors: {},
      setField: vi.fn(),
      setValidationErrors: vi.fn(),
      resetCalc: vi.fn(),
    } as never);

    vi.mocked(useDebtAccountCmds).mockReturnValue({
      createDebtAccount: vi.fn().mockResolvedValue({ id: 'debt-1' }),
      updateDebtAccount: vi.fn().mockResolvedValue({ id: 'debt-1' }),
      removeDebtAccount: vi.fn(),
      loading: false,
      error: null,
    } as never);
  });

  it('submits create flow with mapped payload and create meta', async () => {
    const onSubmitSuccess = vi.fn();
    const onCancel = vi.fn();

    const { useDebtAccountCmds } = await import('@/ui/features/debt/hooks/useDebtAccountCmds');
    const { result } = renderHook(() =>
      useDebtAccountFormViewModel({
        householdId: 'h1',
        projects: [],
        submitLabel: '新增',
        onSubmitSuccess,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(
      vi.mocked(useDebtAccountCmds).mock.results[0]?.value.createDebtAccount,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '房貸 A',
        originalAmount: 1000000,
        monthlyPayment: 25000,
      }),
      expect.objectContaining({
        disbursementDescription: '房貸撥款',
      }),
    );
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
  });

  it('submits edit flow with mapped payload', async () => {
    const onSubmitSuccess = vi.fn();
    const onCancel = vi.fn();

    const { useDebtAccountForm } = await import('@/ui/features/debt/hooks/useDebtAccountForm');
    vi.mocked(useDebtAccountForm).mockReturnValue({
      values: { ...validValues, disbursementDate: '' },
      calcResult: null,
      isManualPayment: false,
      isCreateMode: false,
      errors: {},
      setField: vi.fn(),
      setValidationErrors: vi.fn(),
      resetCalc: vi.fn(),
    } as never);

    const { useDebtAccountCmds } = await import('@/ui/features/debt/hooks/useDebtAccountCmds');
    const { result } = renderHook(() =>
      useDebtAccountFormViewModel({
        householdId: 'h1',
        initialAccount: { id: 'debt-2' } as never,
        projects: [],
        onSubmitSuccess,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(
      vi.mocked(useDebtAccountCmds).mock.results[0]?.value.updateDebtAccount,
    ).toHaveBeenCalledWith('debt-2', expect.objectContaining({ name: '房貸 A' }));
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
  });

  it('maps zod validation errors to form field errors and does not submit', async () => {
    const onSubmitSuccess = vi.fn();
    const onCancel = vi.fn();

    const { useDebtAccountForm } = await import('@/ui/features/debt/hooks/useDebtAccountForm');
    const setValidationErrors = vi.fn();
    vi.mocked(useDebtAccountForm).mockReturnValue({
      values: { ...validValues, monthlyPayment: '' },
      calcResult: null,
      isManualPayment: false,
      isCreateMode: true,
      errors: {},
      setField: vi.fn(),
      setValidationErrors,
      resetCalc: vi.fn(),
    } as never);

    const { useDebtAccountCmds } = await import('@/ui/features/debt/hooks/useDebtAccountCmds');
    const { result } = renderHook(() =>
      useDebtAccountFormViewModel({
        householdId: 'h1',
        projects: [],
        onSubmitSuccess,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(setValidationErrors).toHaveBeenCalled();
    expect(
      vi.mocked(useDebtAccountCmds).mock.results[0]?.value.createDebtAccount,
    ).not.toHaveBeenCalled();
    expect(onSubmitSuccess).not.toHaveBeenCalled();
  });
});
