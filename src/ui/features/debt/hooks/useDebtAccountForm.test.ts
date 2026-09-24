import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDebtAccountForm } from './useDebtAccountForm';

const loanInputs = {
  originalAmount: '1000000',
  interestRate: '2.2',
  startDate: '2026-01-01',
  endDate: '2056-01-01',
};

describe('useDebtAccountForm', () => {
  it('derives the loan calc from the input fields', () => {
    const { result } = renderHook(() => useDebtAccountForm());

    act(() => {
      for (const [field, value] of Object.entries(loanInputs)) {
        result.current.form.setValue(field as never, value as never);
      }
    });

    expect(result.current.calcResult).not.toBeNull();
    expect(result.current.calcResult?.monthlyPayment).toBeGreaterThan(0);
  });

  it('auto-fills monthlyPayment from the calculator and is not manual', () => {
    const { result } = renderHook(() => useDebtAccountForm());

    act(() => {
      for (const [field, value] of Object.entries(loanInputs)) {
        result.current.form.setValue(field as never, value as never);
      }
    });

    const expected = String(result.current.calcResult?.monthlyPayment);
    expect(result.current.values.monthlyPayment).toBe(expected);
    expect(result.current.isManualPayment).toBe(false);
  });

  it('treats a payment the calculator would not produce as a manual override', () => {
    const { result } = renderHook(() => useDebtAccountForm());

    act(() => {
      for (const [field, value] of Object.entries(loanInputs)) {
        result.current.form.setValue(field as never, value as never);
      }
    });
    act(() => {
      result.current.form.setValue('monthlyPayment', '999');
    });

    expect(result.current.isManualPayment).toBe(true);

    act(() => {
      result.current.resetCalc();
    });

    expect(result.current.isManualPayment).toBe(false);
  });

  it('syncs currentBalance to originalAmount in create mode', () => {
    const { result } = renderHook(() => useDebtAccountForm());

    act(() => {
      result.current.form.setValue('originalAmount', '500000');
    });

    expect(result.current.values.currentBalance).toBe('500000');
  });
});
