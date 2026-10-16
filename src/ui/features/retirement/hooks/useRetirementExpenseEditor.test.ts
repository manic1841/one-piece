import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RetirementExpenseCategory } from '@/domains/retirement/types';

import { useRetirementExpenseEditor } from './useRetirementExpenseEditor';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

function expenseFixture(
  overrides: Partial<RetirementExpenseCategory> = {},
): RetirementExpenseCategory {
  return {
    id: 'expense-1',
    name: 'Groceries',
    type: 'general',
    includesPrincipal: false,
    interestOnly: false,
    currentAnnual: 120000,
    retirementMultiplier: 0.7,
    startYear: 2026,
    endYear: null,
    ...overrides,
  };
}

const anchor = { currentYear: 2026, birthYear: 1986, retirementAge: 60, planInflationRate: 2 };

function renderEditor(initialData?: RetirementExpenseCategory) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useRetirementExpenseEditor({ ...anchor, initialData, onSave }));
  return { ...hook, onSave };
}

const submit = (handleSubmit: (event: React.FormEvent) => void) =>
  act(() => handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent));

describe('useRetirementExpenseEditor', () => {
  it('defaults a new general expense to 持續至預期壽命 with an unset endYear and 100% multiplier', async () => {
    const { result, onSave } = renderEditor();
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Groceries'));
    act(() => result.current.form.setValue('currentAnnual', '48000'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ endYear: null, retirementMultiplier: 1 }),
    );
  });

  it('preserves the stored multiplier and endYear on edit', async () => {
    const { result, onSave } = renderEditor(expenseFixture({ endYear: 2055 }));
    act(() => result.current.setOpen(true));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ retirementMultiplier: 0.7, endYear: 2055 }),
    );
  });

  it('flags debt payments and keeps their imported end year', () => {
    const { result } = renderEditor(
      expenseFixture({ type: 'debt_payment', sourceDebtAccountId: 'debt-1', endYear: 2030 }),
    );
    expect(result.current.isDebtPayment).toBe(true);
    expect(result.current.form.getValues('endCondition')).toBe('year');
    expect(result.current.form.getValues('endConditionValue')).toBe('2030');
  });
});
