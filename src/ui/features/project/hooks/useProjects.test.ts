import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjects } from './useProjects';

const execute = vi.fn();

vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: {
    execute: (...args: unknown[]) => execute(...args),
  },
}));

const project = {
  id: 'p1',
  name: 'Kitchen Remodel',
  isActive: true,
  order: 0,
};

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue([project]);
  });

  it('exposes the loaded projects and clears the first-load gate', async () => {
    const { result } = renderHook(() => useProjects('h1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toEqual([project]);
  });

  it('keeps loading false while a reload is in flight', async () => {
    const { result } = renderHook(() => useProjects('h1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let release: (value: unknown) => void = () => {};
    execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    act(() => {
      void result.current.reload();
    });

    expect(result.current.loading).toBe(false);

    await act(async () => {
      release([{ ...project, order: 1 }]);
    });
    expect(result.current.projects).toEqual([{ ...project, order: 1 }]);
  });

  it('re-arms the gate when the household changes', async () => {
    const { result, rerender } = renderHook(({ id }) => useProjects(id), {
      initialProps: { id: 'h1' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ id: 'h2' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
