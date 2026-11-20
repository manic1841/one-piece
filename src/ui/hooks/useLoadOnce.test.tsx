import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLoadOnce } from './useLoadOnce';

/** A promise the test settles by hand, to control completion order. */
function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useLoadOnce', () => {
  it('lets the newest load win when an older one settles later', async () => {
    const slow = deferred();
    const fast = deferred();
    let value: string | null = null;

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => {
        const state = useLoadOnce(
          () => (key === 'a' ? slow.promise : fast.promise),
          (next) => {
            value = next;
          },
          [key],
        );
        return state;
      },
      { initialProps: { key: 'a' } },
    );

    rerender({ key: 'b' });
    await act(async () => fast.resolve('b'));
    await waitFor(() => expect(value).toBe('b'));

    // The abandoned load lands afterwards and must not overwrite the current one.
    await act(async () => slow.resolve('a'));

    expect(value).toBe('b');
    expect(result.current.loading).toBe(false);
  });
});
