import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanDrafts } from './usePlanDrafts';

/**
 * The three draft groups and the one gate over them. Everything here goes
 * through the module's interface: the groups themselves are the implementation.
 */

let latest: ReturnType<typeof usePlanDrafts>;
const onDirty = vi.fn();

function Harness() {
  // eslint-disable-next-line react-hooks/globals
  latest = usePlanDrafts({ onDirty });
  return <div />;
}

const validPlan = {
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [],
};

/** A rule with no name is invalid, whichever side it sits on. */
const invalidPlan = {
  ...validPlan,
  projectionRules: [
    {
      id: 'rule-1',
      name: '',
      ruleType: 'expense' as const,
      enabled: true,
      method: 'inflation' as const,
      parameters: {},
      endCondition: { type: 'lifelong' as const },
    },
  ],
};

/** Leave the retirement age blank so the assumption group is the invalid one. */
const breakAssumptions = () => act(() => latest.assumptions.setField('retirementAge', ''));

describe('usePlanDrafts', () => {
  beforeEach(() => {
    onDirty.mockClear();
    render(<Harness />);
  });

  it('starts clean with every group valid', () => {
    const result = latest.validate();

    expect(result.assumptions.ok).toBe(true);
    expect(result.rules.ok).toBe(true);
    expect(result.events.ok).toBe(true);
    expect(latest.dirty).toBe(false);
  });

  it('reports only the group that is broken', () => {
    breakAssumptions();

    const result = latest.validate();

    expect(result.assumptions.ok).toBe(false);
    expect(result.rules.ok).toBe(true);
    expect(result.events.ok).toBe(true);
  });

  it('returns null from takeValidated and reveals every group when one is broken', () => {
    breakAssumptions();

    let parsed: unknown;
    act(() => {
      parsed = latest.takeValidated();
    });

    expect(parsed).toBeNull();
    // Revealed is what makes an untouched field print its error.
    expect(latest.assumptions.errors.retirementAge).toBeDefined();
  });

  it('returns the domain payload under the domain key names when all are valid', () => {
    let parsed: ReturnType<typeof latest.takeValidated> = null;
    act(() => {
      parsed = latest.takeValidated();
    });

    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed ?? {}).sort()).toEqual([
      'assumptions',
      'lifeEvents',
      'projectionRules',
    ]);
    expect(parsed?.projectionRules).toEqual([]);
  });

  it('marks dirty on an edit and reports it through onDirty', () => {
    act(() => latest.assumptions.setField('retirementAge', '60'));

    expect(latest.dirty).toBe(true);
    expect(onDirty).toHaveBeenCalled();
  });

  it('replaces the whole draft without marking dirty and hides the revealed errors', () => {
    let parsed: ReturnType<typeof latest.takeValidated> = null;
    act(() => {
      parsed = latest.takeValidated();
    });
    expect(parsed).not.toBeNull();
    expect(latest.dirty).toBe(false);

    act(() => latest.replaceAll(invalidPlan));

    // Replacement is never an edit.
    expect(latest.dirty).toBe(false);
    expect(latest.rules.errors['rule-1']).toBeUndefined();
  });

  it('hides what the gate revealed when the draft is replaced', () => {
    breakAssumptions();
    act(() => void latest.takeValidated());
    expect(latest.assumptions.errors.retirementAge).toBeDefined();

    act(() => latest.replaceAll(validPlan));

    expect(latest.dirty).toBe(true);
    expect(latest.assumptions.errors.retirementAge).toBeUndefined();
  });

  it('resets dirty to false only through an explicit reset', () => {
    act(() => latest.assumptions.setField('retirementAge', '60'));
    act(() => latest.reset());

    expect(latest.dirty).toBe(false);
    expect(latest.rules.errors['rule-1']).toBeUndefined();
  });
});
