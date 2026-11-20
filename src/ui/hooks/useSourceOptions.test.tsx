import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSourceOptions } from './useSourceOptions';

/** A promise the test settles by hand, to control completion order. */
function deferred() {
  let resolve!: (value: string[]) => void;
  const promise = new Promise<string[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useSourceOptions', () => {
  it('exposes the loaded items and clears the error on a successful retry', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(['a']);

    const { result } = renderHook(() => useSourceOptions<string>(task, []));

    await waitFor(() => expect(result.current.errorMessage).toContain('boom'));
    expect(result.current.items).toEqual([]);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.items).toEqual(['a']);
  });

  it('keeps the newest result when an older read settles later', async () => {
    const slow = deferred();
    const fast = deferred();
    const task = vi.fn((key: string) => (key === 'a' ? slow.promise : fast.promise));

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useSourceOptions<string>(() => task(key), [key]),
      { initialProps: { key: 'a' } },
    );

    rerender({ key: 'b' });
    await act(async () => fast.resolve(['b']));
    await waitFor(() => expect(result.current.items).toEqual(['b']));

    await act(async () => slow.resolve(['a']));

    expect(result.current.items).toEqual(['b']);
  });
});
