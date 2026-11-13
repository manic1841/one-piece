import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SLEEP_AFTER_MS } from '@/ui/hooks/petMood';

import { usePetMood } from './usePetMood';

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const activity = () =>
  act(() => {
    fireEventActivity();
  });

const fireEventActivity = () => {
  window.dispatchEvent(new Event('keydown'));
};

describe('usePetMood', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rests by default', () => {
    const { result } = renderHook(() => usePetMood());

    expect(result.current.mood).toBe('rest');
  });

  it('plays a notified event', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => result.current.notify('celebrate'));

    expect(result.current.mood).toBe('celebrate');
    expect(result.current.seq).not.toBe(0);
  });

  it('falls back to rest when the event ends', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => result.current.notify('nod'));
    act(() => result.current.endEvent());

    expect(result.current.mood).toBe('rest');
    expect(result.current.seq).toBe(0);
  });

  it('lets a higher-priority event interrupt and ignores a lower one', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => result.current.notify('move'));
    act(() => result.current.notify('alert'));
    expect(result.current.mood).toBe('alert');

    act(() => result.current.notify('celebrate'));
    expect(result.current.mood).toBe('alert');
  });

  it('does not restart the same event inside its cooldown', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => result.current.notify('alert'));
    const firstSeq = result.current.seq;
    act(() => result.current.endEvent());

    act(() => result.current.notify('alert'));

    expect(result.current.mood).toBe('rest');
    expect(result.current.seq).toBe(0);
    expect(firstSeq).not.toBe(0);
  });

  it('always accepts celebrate, which has no cooldown', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => result.current.notify('celebrate'));
    act(() => result.current.endEvent());
    act(() => result.current.notify('celebrate'));

    expect(result.current.mood).toBe('celebrate');
  });

  it('falls asleep after the idle window', () => {
    const { result } = renderHook(() => usePetMood());

    advance(SLEEP_AFTER_MS);

    expect(result.current.mood).toBe('sleep');
  });

  it('wakes on interaction and restarts the countdown', () => {
    const { result } = renderHook(() => usePetMood());

    advance(SLEEP_AFTER_MS);
    activity();

    expect(result.current.mood).toBe('rest');

    advance(SLEEP_AFTER_MS / 2);
    expect(result.current.mood).toBe('rest');

    advance(SLEEP_AFTER_MS / 2);
    expect(result.current.mood).toBe('sleep');
  });

  it('keeps an event playing while it lasts, then falls back to sleep', () => {
    const { result } = renderHook(() => usePetMood());

    advance(SLEEP_AFTER_MS);
    act(() => result.current.notify('celebrate'));
    expect(result.current.mood).toBe('celebrate');

    act(() => result.current.endEvent());

    expect(result.current.mood).toBe('sleep');
  });

  it('pauses the countdown while the tab is hidden', () => {
    const { result } = renderHook(() => usePetMood());

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(SLEEP_AFTER_MS);

    expect(result.current.mood).toBe('rest');
  });
});
