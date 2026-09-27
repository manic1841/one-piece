import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLoadingTask } from './useLoadingTask';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useLoadingTask result contract', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useLoadingTask());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('reports a successful run as ok with its value', async () => {
    const { result } = renderHook(() => useLoadingTask());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(async () => 42);
    });

    expect(outcome).toEqual({ ok: true, value: 42 });
    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('treats undefined as a legitimate success value', async () => {
    const { result } = renderHook(() => useLoadingTask());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(async () => undefined);
    });

    expect(outcome).toEqual({ ok: true, value: undefined });
  });

  it('raises loading for the duration of the run', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const gate = deferred<number>();

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.run(() => gate.promise);
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      gate.resolve(7);
      await pending;
    });

    expect(result.current.loading).toBe(false);
  });

  it('keeps loading true while overlapping runs are in flight', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const first = deferred<string>();
    const second = deferred<string>();

    let both!: Promise<unknown>;
    act(() => {
      both = Promise.all([
        result.current.run(() => first.promise),
        result.current.run(() => second.promise),
      ]);
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      first.resolve('a');
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      second.resolve('b');
      await both;
    });
    expect(result.current.loading).toBe(false);
  });

  it('reports a failed run as failed with the original thrown value', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const failure = new TypeError('offline');

    let outcome: { ok: boolean; kind?: string; error?: unknown };
    await act(async () => {
      outcome = (await result.current.run(async () => {
        throw failure;
      })) as typeof outcome;
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.kind).toBe('failed');
    expect(outcome.error).toBe(failure);
  });

  it('exposes the raw error and its message separately', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const failure = new TypeError('offline');

    await act(async () => {
      await result.current.run(async () => {
        throw failure;
      });
    });

    expect(result.current.error).toBe(failure);
    expect(result.current.errorMessage).toBe('offline');
  });

  it('does not stringify a non-Error thrown value into the message', async () => {
    const { result } = renderHook(() => useLoadingTask());

    await act(async () => {
      await result.current.run(async () => {
        throw { code: 'UNKNOWN' };
      });
    });

    expect(result.current.error).toEqual({ code: 'UNKNOWN' });
    expect(result.current.errorMessage).toBe('發生未知錯誤');
  });

  it('clears a previous error when a new run starts', async () => {
    const { result } = renderHook(() => useLoadingTask());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('first');
      });
    });
    expect(result.current.errorMessage).toBe('first');

    await act(async () => {
      await result.current.run(async () => 'second');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('never rejects', async () => {
    const { result } = renderHook(() => useLoadingTask());

    await expect(
      act(async () => {
        await result.current.run(async () => {
          throw new Error('boom');
        });
      }),
    ).resolves.not.toThrow();
  });
});

describe('useLoadingTask cancellation', () => {
  it('hands the task a signal that follows the caller signal', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();
    const gate = deferred<string>();
    let taskSignal!: AbortSignal;

    await act(async () => {
      const pending = result.current.run(
        (signal) => {
          taskSignal = signal;
          return gate.promise;
        },
        { signal: caller.signal },
      );
      caller.abort();
      gate.resolve('ignored');
      expect(await pending).toEqual({ ok: false, kind: 'aborted' });
    });

    expect(taskSignal.aborted).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('does not run the task when the caller signal is already aborted', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();
    caller.abort();
    const task = vi.fn(async () => 'never');

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(task, { signal: caller.signal });
    });

    expect(outcome).toEqual({ ok: false, kind: 'aborted' });
    expect(task).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports aborted when the task rejects with the abort reason', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();
    const gate = deferred<void>();

    await act(async () => {
      const pending = result.current.run(
        async (signal) => {
          await gate.promise;
          throw signal.reason ?? new Error('aborted');
        },
        { signal: caller.signal },
      );
      caller.abort();
      gate.resolve();
      expect(await pending).toEqual({ ok: false, kind: 'aborted' });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('abandons an in-flight run when the component unmounts', async () => {
    const { result, unmount } = renderHook(() => useLoadingTask());
    const gate = deferred<string>();
    let taskSignal!: AbortSignal;
    let pending!: Promise<unknown>;

    act(() => {
      pending = result.current.run((signal) => {
        taskSignal = signal;
        return gate.promise;
      });
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    unmount();
    expect(taskSignal.aborted).toBe(true);

    gate.resolve('ignored');
    await expect(pending).resolves.toEqual({ ok: false, kind: 'aborted' });
  });

  it('runs normally when neither signal aborts', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(
        async (signal) => {
          expect(signal.aborted).toBe(false);
          return 'kept';
        },
        { signal: caller.signal },
      );
    });

    expect(outcome).toEqual({ ok: true, value: 'kept' });
  });
});

describe('useLoadingTask initial loading', () => {
  it('starts loading when asked to', () => {
    const { result } = renderHook(() => useLoadingTask({ initiallyLoading: true }));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('stays loading across the hand-off from the seed to the first run', async () => {
    const { result } = renderHook(() => useLoadingTask({ initiallyLoading: true }));
    const gate = deferred<string>();
    // Observed from the first render through the run: the seed and the run's
    // own count must overlap, or the first paint flickers to "not loading".
    const seen: boolean[] = [];
    seen.push(result.current.loading);

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.run(() => gate.promise);
    });
    seen.push(result.current.loading);

    await act(async () => {
      gate.resolve('loaded');
      await pending;
    });

    expect(seen).toEqual([true, true]);
    expect(result.current.loading).toBe(false);
  });

  it('releases the seed when the run fails', async () => {
    const { result } = renderHook(() => useLoadingTask({ initiallyLoading: true }));

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('offline');
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.errorMessage).toBe('offline');
  });

  it('releases the seed even when the run is abandoned before it starts', async () => {
    const { result } = renderHook(() => useLoadingTask({ initiallyLoading: true }));
    const caller = new AbortController();
    caller.abort();
    let taskRan = false;

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(
        async () => {
          taskRan = true;
          return 'never';
        },
        { signal: caller.signal },
      );
    });

    expect(outcome).toEqual({ ok: false, kind: 'aborted' });
    expect(taskRan).toBe(false);
    // Releasing the seed on the call — not on the task settling — is what makes
    // this option safe: a hook that abandons its very first run still ends up
    // with a `loading` that can drop.
    expect(result.current.loading).toBe(false);
  });

  it('does not start loading unless asked to', () => {
    const { result } = renderHook(() => useLoadingTask({}));

    expect(result.current.loading).toBe(false);
  });
});

describe('useLoadingTask write-back', () => {
  it('hands the outcome to writeBack and still returns it', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const seen: unknown[] = [];

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(async () => 42, {
        writeBack: (r) => seen.push(r),
      });
    });

    expect(seen).toEqual([{ ok: true, value: 42 }]);
    expect(outcome).toEqual({ ok: true, value: 42 });
  });

  it('hands a failed run to writeBack with the original thrown value', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const failure = new TypeError('offline');
    const seen: unknown[] = [];

    await act(async () => {
      await result.current.run(
        async () => {
          throw failure;
        },
        { writeBack: (r) => seen.push(r) },
      );
    });

    expect(seen).toEqual([{ ok: false, error: failure }]);
    expect(result.current.error).toBe(failure);
  });

  it('does not write back a run the caller abandons', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();
    const gate = deferred<string>();
    const writeBack = vi.fn();

    await act(async () => {
      const pending = result.current.run(() => gate.promise, {
        signal: caller.signal,
        writeBack,
      });
      caller.abort();
      gate.resolve('ignored');
      expect(await pending).toEqual({ ok: false, kind: 'aborted' });
    });

    expect(writeBack).not.toHaveBeenCalled();
  });

  it('does not write back a run abandoned by unmount', async () => {
    const { result, unmount } = renderHook(() => useLoadingTask());
    const gate = deferred<string>();
    const writeBack = vi.fn();

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.run(() => gate.promise, { writeBack });
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    unmount();
    gate.resolve('ignored');

    await expect(pending).resolves.toEqual({ ok: false, kind: 'aborted' });
    expect(writeBack).not.toHaveBeenCalled();
  });

  it('does not write back a run whose signal is already aborted', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const caller = new AbortController();
    caller.abort();
    const writeBack = vi.fn();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(async () => 'never', {
        signal: caller.signal,
        writeBack,
      });
    });

    expect(outcome).toEqual({ ok: false, kind: 'aborted' });
    expect(writeBack).not.toHaveBeenCalled();
  });

  it('lets a throwing writeBack propagate without stranding loading', async () => {
    const { result } = renderHook(() => useLoadingTask());
    const bug = new Error('writeBack bug');

    await act(async () => {
      await expect(
        result.current.run(async () => 1, {
          writeBack: () => {
            throw bug;
          },
        }),
      ).rejects.toThrow(bug);
    });

    // The write-back is the caller's own bug, not the task's failure: the error
    // channel stays clean, and `loading` has already dropped.
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
