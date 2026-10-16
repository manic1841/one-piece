import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRetirementAssumptionsForm } from './useRetirementAssumptionsForm';

const assumptions = {
  currentAge: 36,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
  currentYear: 2026,
  retirementYear: 2050,
  lifeExpectancyYear: 2075,
};

const TODAY = new Date().getFullYear();

describe('useRetirementAssumptionsForm', () => {
  it('seeds the form with field strings when entering edit mode', () => {
    const { result } = renderHook(() =>
      useRetirementAssumptionsForm({ assumptions, onSave: vi.fn() }),
    );

    expect(result.current.editing).toBe(false);

    act(() => {
      result.current.startEdit();
    });

    expect(result.current.editing).toBe(true);
    expect(result.current.form.getValues()).toEqual({
      currentAge: '36',
      retirementAge: '60',
      lifeExpectancy: '85',
      inflationRate: '2',
      investmentReturnRate: '5',
    });
  });

  it('saves plan updates that refresh the current year and re-anchor the birth year', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useRetirementAssumptionsForm({ assumptions, onSave }));

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.form.setValue('inflationRate', '2.5');
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      currentYear: TODAY,
      birthYear: TODAY - 36,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2.5,
      investmentReturnRate: 5,
    });
    await waitFor(() => expect(result.current.editing).toBe(false));
  });

  it('leaves the birth year unchanged when the current age is untouched', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useRetirementAssumptionsForm({
        assumptions: { ...assumptions, currentAge: TODAY - 1990, currentYear: TODAY },
        onSave,
      }),
    );

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ birthYear: 1990 }));
  });

  it('does not save a non-integer age', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useRetirementAssumptionsForm({ assumptions, onSave }));

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.form.setValue('currentAge', '36.5');
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.form.formState.errors.currentAge).toBeDefined());
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(true);
  });

  it('blocks saving when the timeline order is invalid', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useRetirementAssumptionsForm({ assumptions, onSave }));

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.form.setValue('retirementAge', '30');
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.form.formState.errors.retirementAge).toBeDefined());
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.editing).toBe(true);
  });

  it('discards a stale draft when edit mode is cancelled', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useRetirementAssumptionsForm({ assumptions, onSave }));

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.form.setValue('currentAge', '99');
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.editing).toBe(false);
    expect(result.current.form.getValues('currentAge')).toBe('36');
    expect(onSave).not.toHaveBeenCalled();
  });
});
