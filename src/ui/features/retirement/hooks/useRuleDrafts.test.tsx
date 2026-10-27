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
