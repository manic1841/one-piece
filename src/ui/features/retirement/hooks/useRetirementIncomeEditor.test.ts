import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RetirementIncomeSource } from '@/domains/retirement/types';

import { useRetirementIncomeEditor } from './useRetirementIncomeEditor';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

function incomeFixture(overrides: Partial<RetirementIncomeSource> = {}): RetirementIncomeSource {
  return {
    id: 'income-1',
    name: 'Salary',
    type: 'salary',
    lifelong: false,
    startYear: 2026,
    endYear: 2046,
    currentAnnual: 120000,
    growthRate: 2,
    ...overrides,
  };
}

const anchor = { currentYear: 2026, birthYear: 1986, retirementAge: 60, planInflationRate: 2 };

function renderEditor(initialData?: RetirementIncomeSource) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useRetirementIncomeEditor({ ...anchor, initialData, onSave }));
  return { ...hook, onSave };
}

const submit = (handleSubmit: (event: React.FormEvent) => void) =>
  act(() => handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent));

describe('useRetirementIncomeEditor', () => {
  it('collapses the default 退休時結束 into an endYear at the retirement year', async () => {
    const { result, onSave } = renderEditor();
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Salary'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: 'salary', lifelong: false, endYear: 2046 }),
    );
  });

  it('keeps the end-condition default in step with the income type (create mode)', async () => {
    const { result } = renderEditor();
    act(() => result.current.setOpen(true));

    act(() => result.current.form.setValue('type', 'pension'));

    await waitFor(() => expect(result.current.form.getValues('endCondition')).toBe('lifelong'));
  });

  it('persists 持續至預期壽命 as lifelong with no endYear', async () => {
    const { result, onSave } = renderEditor();
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Salary'));
    act(() => result.current.form.setValue('endCondition', 'lifelong'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(expect.objectContaining({ lifelong: true }));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('endYear');
  });

  it('reads an existing retirement-year endYear back as 退休時結束', () => {
    const { result } = renderEditor(incomeFixture({ endYear: 2046 }));
    expect(result.current.form.getValues('endCondition')).toBe('retirement');
  });

  it('reads an existing non-retirement endYear back as 指定年份', () => {
    const { result } = renderEditor(incomeFixture({ endYear: 2055 }));
    expect(result.current.form.getValues('endCondition')).toBe('year');
    expect(result.current.form.getValues('endConditionValue')).toBe('2055');
  });

  it('preserves the stored retirementAnnual on edit (退休後水準 exits the UI)', async () => {
    const { result, onSave } = renderEditor(
      incomeFixture({ endYear: 2055, retirementAnnual: 30000 }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Salary'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ retirementAnnual: 30000, endYear: 2055 }),
    );
  });
});
