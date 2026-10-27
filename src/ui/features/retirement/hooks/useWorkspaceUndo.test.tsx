import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkspaceUndo } from './useWorkspaceUndo';

describe('useWorkspaceUndo', () => {
  it('starts disabled and replays the last push once', () => {
    const { result } = renderHook(() => useWorkspaceUndo());
    expect(result.current.canUndo).toBe(false);

    const restore = vi.fn();
    act(() => result.current.push(restore));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(restore).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
  });

  it('keeps at most twenty entries, dropping the oldest', () => {
    const { result } = renderHook(() => useWorkspaceUndo());
    const calls: number[] = [];
    for (let index = 0; index < 25; index += 1) {
      act(() => result.current.push(() => calls.push(index)));
    }

    for (let index = 0; index < 20; index += 1) act(() => result.current.undo());
    expect(calls).toHaveLength(20);
    expect(calls[0]).toBe(24);
    expect(calls[19]).toBe(5);
  });

  it('clears the stack', () => {
    const { result } = renderHook(() => useWorkspaceUndo());
    act(() => result.current.push(() => undefined));
    act(() => result.current.clear());
    expect(result.current.canUndo).toBe(false);
  });
});
