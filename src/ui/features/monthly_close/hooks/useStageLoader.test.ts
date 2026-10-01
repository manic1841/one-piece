import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStageLoader } from './useStageLoader';

interface Props {
  key: string;
  enabled: boolean;
}

const renderLoader = (
  load: (signal: AbortSignal) => Promise<string>,
  initial: Partial<Props> = {},
) =>
  renderHook(({ key, enabled }: Props) => useStageLoader({ key, enabled, load }), {
    initialProps: { key: '2026-08', enabled: true, ...initial } as Props,
  });

describe('useStageLoader', () => {
  it('exposes the value loaded for the key with isReady', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load);

    await waitFor(() => expect(result.current.data).toBe('august'));
    expect(result.current.isReady).toBe(true);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('retires the value on a key change before the new load resolves', async () => {
    const load = vi.fn(async (signal: AbortSignal) => signal.aborted || 'pending');
    const { result, rerender } = renderLoader(load);
    await waitFor(() => expect(result.current.data).toBe('pending'));

    load.mockReturnValueOnce(new Promise(() => {}));
    act(() => rerender({ key: '2026-09', enabled: true }));

    expect(result.current.data).toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  it('does not load while the gate is closed', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load, { enabled: false });

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('supersedes a slow older run so it cannot land last and win', async () => {
    let resolveAugust: (value: string) => void = () => {};
    const load = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveAugust = resolve)))
      .mockImplementationOnce(async () => 'september');

    const { result, rerender } = renderLoader(load);
    act(() => rerender({ key: '2026-09', enabled: true }));
    await waitFor(() => expect(result.current.data).toBe('september'));

    await act(async () => {
      resolveAugust('august');
    });

    expect(result.current.data).toBe('september');
  });

  it('writes nothing on failure and reports the failure message', async () => {
    const load = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderLoader(load);

    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));
    expect(result.current.data).toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  it('keeps the last known value on a same-key refresh failure but marks it not ready', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load);
    await waitFor(() => expect(result.current.data).toBe('august'));

    load.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBe('august');
    expect(result.current.errorMessage).toBe('boom');
    expect(result.current.isReady).toBe(false);
  });

  it('reloads through refresh and clears the previous failure', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load);
    await waitFor(() => expect(result.current.data).toBe('august'));

    load.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));

    load.mockImplementationOnce(async () => 'august-2');
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBe('august-2');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isReady).toBe(true);
  });
});
