import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/watch_list/use_cases/listWatchListUseCase', () => ({
  listWatchListUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/watch_list/use_cases/addWatchListTargetUseCase', () => ({
  addWatchListTargetUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/watch_list/use_cases/removeWatchListTargetUseCase', () => ({
  removeWatchListTargetUseCase: { execute: vi.fn() },
}));
vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

import { addWatchListTargetUseCase } from '@/application/watch_list/use_cases/addWatchListTargetUseCase';
import { listWatchListUseCase } from '@/application/watch_list/use_cases/listWatchListUseCase';
import { removeWatchListTargetUseCase } from '@/application/watch_list/use_cases/removeWatchListTargetUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useWatchListSettings } from './useWatchListSettings';

vi.mocked(useAuthState).mockReturnValue({
  userProfile: { householdId: 'household-1' },
} as ReturnType<typeof useAuthState>);

describe('useWatchListSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWatchListUseCase.execute).mockResolvedValue([]);
  });

  it('loads targets for the household on mount', async () => {
    const { result } = renderHook(() => useWatchListSettings());

    await waitFor(() => {
      expect(listWatchListUseCase.execute).toHaveBeenCalledWith({
        householdId: 'household-1',
        auth: { uid: '', email: '', isGlobalAdmin: undefined },
      });
      expect(result.current.targets).toEqual([]);
    });
  });

  it('adds a target then refreshes the list', async () => {
    vi.mocked(addWatchListTargetUseCase.execute).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWatchListSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTarget('PROJECT', 'p1', '媽媽專案');
    });

    expect(addWatchListTargetUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth: { uid: '', email: '', isGlobalAdmin: undefined },
      userEmail: '',
      target: { targetType: 'PROJECT', targetId: 'p1', name: '媽媽專案' },
    });
    expect(listWatchListUseCase.execute).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe('');
  });

  it('removes a target then refreshes the list', async () => {
    vi.mocked(removeWatchListTargetUseCase.execute).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWatchListSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeTarget('DEBT_ACCOUNT', 'd1');
    });

    expect(removeWatchListTargetUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth: { uid: '', email: '', isGlobalAdmin: undefined },
      targetType: 'DEBT_ACCOUNT',
      targetId: 'd1',
    });
    expect(listWatchListUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('surfaces add errors and still refreshes', async () => {
    vi.mocked(addWatchListTargetUseCase.execute).mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useWatchListSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTarget('PROJECT', 'p1', '媽媽專案');
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.saving).toBe(false);
  });

  it('does nothing without a household id', async () => {
    vi.mocked(useAuthState).mockReturnValue({ userProfile: undefined } as ReturnType<typeof useAuthState>);
    const { result } = renderHook(() => useWatchListSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTarget('PROJECT', 'p1', '媽媽專案');
    });

    expect(addWatchListTargetUseCase.execute).not.toHaveBeenCalled();
  });
});
