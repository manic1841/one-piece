import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useProjectionCalculate } from '@/ui/features/retirement/hooks/useProjectionCalculate';

const plan = {
  assumptions: { currentAge: 40 },
  projectionRules: [],
  lifeEvents: [],
} as never;

function harness(
  overrides: {
    openingError?: string;
    startYearError?: string;
    plan?: typeof plan | null;
  } = {},
) {
  const calculateProjection = vi.fn(async () => ({ ok: true as const, value: {} as never }));
  const takeValidatedPlan = vi.fn(() => (overrides.plan === undefined ? plan : overrides.plan));
  const setOpeningValidationError = vi.fn();
  const setStartYearValidationError = vi.fn();

  const rendered = renderHook(() =>
    useProjectionCalculate({
      startYear: 2030,
      opening: { source: 'snapshot', amountText: '1000' } as never,
      calculateProjection: calculateProjection as never,
      validate: () => ({
        openingError: overrides.openingError,
        startYearError: overrides.startYearError,
      }),
      takeValidatedPlan: takeValidatedPlan as never,
      onSuccess: vi.fn(),
      setOpeningValidationError,
      setStartYearValidationError,
    }),
  );

  return { ...rendered, calculateProjection, takeValidatedPlan, setOpeningValidationError };
}

describe('useProjectionCalculate', () => {
  it('does not call the calculator when the opening is invalid', () => {
    const {
      result,
      calculateProjection: calculate,
      setOpeningValidationError,
    } = harness({
      openingError: 'bad opening',
    });

    act(() => void result.current.calculate());

    expect(setOpeningValidationError).toHaveBeenCalledWith('bad opening');
    expect(calculate).not.toHaveBeenCalled();
  });

  it('does not call the calculator when the start year is invalid', () => {
    const { result, calculateProjection: calculate } = harness({ startYearError: 'bad year' });

    act(() => void result.current.calculate());

    expect(calculate).not.toHaveBeenCalled();
  });

  it('reveals the draft errors even though the opening already blocks', () => {
    const { result, takeValidatedPlan } = harness({ openingError: 'bad opening' });

    act(() => void result.current.calculate());

    // The gate always runs so the user sees every problem in one press.
    expect(takeValidatedPlan).toHaveBeenCalled();
  });

  it('calculates when the draft gate and both workspace fields pass', () => {
    const { result, calculateProjection: calculate } = harness();

    act(() => void result.current.calculate());

    expect(calculate).toHaveBeenCalledWith(expect.objectContaining({ startYear: 2030 }));
  });
});
