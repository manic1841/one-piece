import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TOAST_TIMEOUT_MS, showToast } from '@/ui/components/Toast';

import { useUndo } from './useUndo';

// Keep the real timeout constant; stub only the toast emission so tests can
// drive the action the hook placed on the slot.
vi.mock('@/ui/components/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/ui/components/Toast')>();
  return { ...actual, showToast: vi.fn() };
});

const showToastMock = vi.mocked(showToast);

/** The `onAction` the hook wired into the toast emitted by the Nth `offer`. */
function actionOf(call: number): () => void {
  const options = showToastMock.mock.calls[call][2];
  if (!options?.onAction) throw new Error(`offer #${call} did not surface an action`);
  return options.onAction;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useUndo', () => {
  it('surfaces a toast carrying the message and an Undo action by default', () => {
    const { result } = renderHook(() => useUndo());

    act(() => result.current.offer({ message: 'ROW DELETED', undo: vi.fn() }));

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      'ROW DELETED',
      'success',
      expect.objectContaining({ actionLabel: 'UNDO' }),
    );
  });

  it('invokes the compensate callback when the Undo action is taken', () => {
    const { result } = renderHook(() => useUndo());
    const undo = vi.fn();

    act(() => result.current.offer({ message: 'ROW DELETED', undo }));
    act(() => actionOf(0)());

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('discards the previous offer when a new one arrives (single slot)', () => {
    const { result } = renderHook(() => useUndo());
    const first = vi.fn();
    const second = vi.fn();

    act(() => result.current.offer({ message: 'FIRST DELETED', undo: first }));
    const staleAction = actionOf(0);

    act(() => result.current.offer({ message: 'SECOND DELETED', undo: second }));
    act(() => staleAction());

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    act(() => actionOf(1)());
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('expires the slot after the timeout so a late Undo does nothing', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUndo());
    const undo = vi.fn();

    act(() => result.current.offer({ message: 'ROW DELETED', undo }));
    const action = actionOf(0);

    act(() => {
      vi.advanceTimersByTime(TOAST_TIMEOUT_MS);
    });
    act(() => action());

    expect(undo).not.toHaveBeenCalled();
  });
});
