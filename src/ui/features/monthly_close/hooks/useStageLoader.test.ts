import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStageLoader } from './useStageLoader';

interface Props {
  enabled: boolean;
}

const renderLoader = (
  load: (signal: AbortSignal) => Promise<string>,
  initial: Partial<Props> = {},
) =>
  renderHook(({ enabled }: Props) => useStageLoader({ enabled, load }), {
    initialProps: { enabled: true, ...initial } as Props,
  });

describe('useStageLoader', () => {
  it('exposes the loaded value with isLoaded', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load);

    await waitFor(() => expect(result.current.data).toBe('august'));
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not load while the gate is closed', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load, { enabled: false });

    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('loads once the gate opens', async () => {
    const load = vi.fn(async () => 'august');
    const { result, rerender } = renderLoader(load, { enabled: false });

    act(() => rerender({ enabled: true }));

    await waitFor(() => expect(result.current.data).toBe('august'));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('supersedes a slow older run so it cannot land last and win', async () => {
    let resolveAugust: (value: string) => void = () => {};
    const load = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveAugust = resolve)))
      .mockImplementationOnce(async () => 'september');

    const { result, rerender } = renderLoader(load);
    act(() => rerender({ enabled: false }));
    act(() => rerender({ enabled: true }));
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
    expect(result.current.isLoaded).toBe(false);
  });

  it('keeps the last known value on a refresh failure but marks it not ready', async () => {
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
    expect(result.current.isLoaded).toBe(false);
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
    expect(result.current.isLoaded).toBe(true);
  });

  it('refreshes even while the gate is closed', async () => {
    const load = vi.fn(async () => 'august');
    const { result } = renderLoader(load, { enabled: false });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBe('august');
  });
});
