import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectPage } from './useProjectPage';

const { reload, createProject, projects, identity, balances, executeBalances } = vi.hoisted(() => ({
  reload: vi.fn(),
  createProject: vi.fn(),
  // Stable identity: `useProjectPage` copies `projects` into state on every
  // change, so a fresh array per render would loop forever.
  projects: [] as never[],
  identity: { uid: 'u1', email: 'u1@onepiece.test', isGlobalAdmin: false },
  balances: new Map(),
  executeBalances: vi.fn(),
}));

vi.mock('./useProjects', () => ({
  useProjects: () => ({ projects, loading: false, error: null, reload }),
}));

vi.mock('./useProjectCmds', () => ({
  useProjectCmds: () => ({ createProject, updateProject: vi.fn(), reorderProjects: vi.fn() }),
}));

vi.mock('@/application/project/use_cases/listProjectBalancesUseCase', () => ({
  listProjectBalancesUseCase: { execute: executeBalances },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => identity,
}));

const args = {
  id: '',
  project: { name: 'Kitchen Remodel' } as never,
};

describe('useProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProject.mockResolvedValue({ ok: true, value: 'new-id' });
    executeBalances.mockResolvedValue(balances);
  });

  it('refreshes the list after a successful create so the row appears', async () => {
    const { result } = renderHook(() => useProjectPage('h1'));

    await act(async () => {
      await result.current.create(args);
    });

    expect(createProject).toHaveBeenCalledWith(args.project);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when the create failed', async () => {
    createProject.mockResolvedValue({ ok: false, kind: 'failed', error: new Error('nope') });
    const { result } = renderHook(() => useProjectPage('h1'));

    await act(async () => {
      await result.current.create(args);
    });

    expect(reload).not.toHaveBeenCalled();
  });
});
