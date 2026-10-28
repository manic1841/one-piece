import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRuleDrafts } from './useRuleDrafts';

let latest: ReturnType<typeof useRuleDrafts>;

function Harness() {
  // eslint-disable-next-line react-hooks/globals
  latest = useRuleDrafts(vi.fn());
  return <div />;
}

describe('useRuleDrafts add', () => {
  it('appends on consecutive adds and returns the new id', () => {
    render(<Harness />);

    let first: string | null = null;
    act(() => {
      first = latest.add('income');
    });

    let second: string | null = null;
    act(() => {
      second = latest.add('expense');
    });

    expect(latest.rules).toHaveLength(2);
    expect(first).not.toBe(second);
  });
});

describe('useRuleDrafts setRuleType', () => {
  it('drops the debt source when the new side cannot amortize', () => {
    render(<Harness />);
    let id: string | null = null;
    act(() => {
      id = latest.add('expense');
    });
    if (id === null) throw new Error('no draft');

    act(() => {
      latest.setMethod(id, 'debtAmortization');
    });
    act(() => {
      latest.setSourceType(id, 'debtAccount');
    });

    // Income has no debt amortization, so the method falls back and the source
    // pair has to fall back with it — a debt account is not a valid source then.
    act(() => {
      latest.setRuleType(id, 'income');
    });

    const [rule] = latest.rules;
    expect(rule.ruleType).toBe('income');
    expect(rule.method).toBe('inflation');
    expect(rule.sourceType).toBe('ledgerCode');
    expect(rule.sourceId).toBe('');
  });
});
