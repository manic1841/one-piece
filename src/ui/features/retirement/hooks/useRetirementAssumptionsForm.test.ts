import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRetirementAssumptionsForm } from './useRetirementAssumptionsForm';

const assumptions = {
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
};

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
      currentYear: '2026',
      birthYear: '1990',
      retirementAge: '60',
      lifeExpectancy: '85',
      inflationRate: '2',
      investmentReturnRate: '5',
    });
  });

  it('saves coerced numbers and leaves edit mode', async () => {
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
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2.5,
      investmentReturnRate: 5,
    });
    await waitFor(() => expect(result.current.editing).toBe(false));
  });

  it('does not save a non-integer year', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useRetirementAssumptionsForm({ assumptions, onSave }));

    act(() => {
      result.current.startEdit();
    });
    act(() => {
      result.current.form.setValue('currentYear', '2026.5');
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.form.formState.errors.currentYear).toBeDefined());
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
      result.current.form.setValue('currentYear', '1999');
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.editing).toBe(false);
    expect(result.current.form.getValues('currentYear')).toBe('2026');
    expect(onSave).not.toHaveBeenCalled();
  });
});
