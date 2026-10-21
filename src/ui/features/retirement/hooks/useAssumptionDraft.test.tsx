import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssumptionDraft } from './useAssumptionDraft';

let latest: ReturnType<typeof useAssumptionDraft>;
const markDirty = vi.fn();

function Harness() {
  // eslint-disable-next-line react-hooks/globals
  latest = useAssumptionDraft(markDirty, 2026);
  return <div />;
}

describe('useAssumptionDraft', () => {
  beforeEach(() => {
    markDirty.mockClear();
    render(<Harness />);
  });

  it('converts percentage input to a 4 dp decimal', () => {
    act(() => {
      latest.setField('birthYear', '1980');
      latest.setField('retirementAge', '65');
      latest.setField('lifeExpectancy', '90');
      latest.setField('inflationRate', '2.5');
      latest.setField('annualReturnRate', '5');
    });

    const result = latest.validate();
    expect(result.ok).toBe(true);
    expect(result.data?.inflationRate).toBe(0.025);
    expect(result.data?.annualReturnRate).toBe(0.05);
  });

  it('rounds percentages to four decimal places of the stored value', () => {
    act(() => {
      latest.setField('birthYear', '1980');
      latest.setField('retirementAge', '65');
      latest.setField('lifeExpectancy', '90');
      latest.setField('annualReturnRate', '5');
      latest.setField('inflationRate', '2.12345');
    });
    expect(latest.validate().data?.inflationRate).toBe(0.0212);
  });

  it('reports schema codes as labels on the field path', () => {
    act(() => latest.setField('retirementAge', 'abc'));

    const result = latest.validate();
    expect(result.ok).toBe(false);
    expect(result.errors.retirementAge).toBe('必須是整數');
  });

  it('shows errors for touched fields only', () => {
    act(() => latest.setField('inflationRate', '99'));
    expect(latest.errors.inflationRate).toBe('超出允許範圍');
    expect(latest.errors.retirementAge).toBeUndefined();
  });

  it('locks birthYear and renders decimals as percentages after a plan reset', () => {
    expect(latest.birthYearLocked).toBe(false);

    act(() =>
      latest.resetFrom({
        birthYear: 1970,
        retirementAge: 55,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
      }),
    );

    expect(latest.birthYearLocked).toBe(true);
    expect(latest.values.birthYear).toBe('1970');
    expect(latest.values.inflationRate).toBe('2');
    expect(latest.values.annualReturnRate).toBe('5');
    expect(latest.validate().data?.inflationRate).toBe(0.02);
  });

  it('marks the workspace dirty on every edit', () => {
    act(() => latest.setField('birthYear', '1980'));
    expect(markDirty).toHaveBeenCalled();
  });
});
