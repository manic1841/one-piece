import { type ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getHouseholdsByUserUseCase } from '@/application/household/use_cases/getHouseholdsByUserUseCase';
import { RoleEnum } from '@/domains/household/role';
import { type Household } from '@/domains/household/schemas';
import { type AuthState } from '@/ui/contexts/AuthStateContext';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';

import { useHouseholdSwitcher } from './useHouseholdSwitcher';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

vi.mock('@/application/household/use_cases/getHouseholdsByUserUseCase', () => ({
  getHouseholdsByUserUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/household/use_cases/switchHouseholdUseCase', () => ({
  switchHouseholdUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/household/use_cases/leaveHouseholdUseCase', () => ({
  leaveHouseholdUseCase: { execute: vi.fn() },
}));

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: vi.fn(),
}));

const executeMock = vi.mocked(getHouseholdsByUserUseCase.execute);

const authState = (overrides: Partial<AuthState> = {}): AuthState => ({
  user: { uid: 'user-1', email: 'user@example.com' },
  userProfile: null,
  isAdmin: false,
  loading: false,
  initError: null,
  logout: vi.fn(),
  loginWithGoogle: vi.fn(),
  refreshProfile: vi.fn(),
  ...overrides,
});

const household = (id: string, name: string): Household => ({
  id,
  name,
  memberUids: ['user-1'],
  members: { 'user-1': { role: RoleEnum.OWNER, joinedAt: new Date('2026-01-01') } },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const renderSwitcher = (isOpen: boolean) =>
  renderHook(({ open }: { open: boolean }) => useHouseholdSwitcher('household-1', open, vi.fn()), {
    initialProps: { open: isOpen },
    wrapper,
  });

describe('useHouseholdSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthState).mockReturnValue(authState());
    vi.mocked(useConfirm).mockReturnValue({ confirm: vi.fn() } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the households of the signed-in user when opened', async () => {
    executeMock.mockResolvedValue([household('h1', 'Home'), household('h2', 'Cabin')]);

    const { result } = renderSwitcher(true);

    await waitFor(() => expect(result.current.households).toHaveLength(2));

    expect(executeMock).toHaveBeenCalledWith({ uid: 'user-1' });
    expect(result.current.households.map((h) => h.name)).toEqual(['Home', 'Cabin']);
    expect(result.current.loading).toBe(false);
  });

  it('does not load while the switcher is closed', async () => {
    const { result } = renderSwitcher(false);

    await act(async () => {});

    expect(executeMock).not.toHaveBeenCalled();
    expect(result.current.households).toEqual([]);
  });

  it('does not load without a signed-in user', async () => {
    vi.mocked(useAuthState).mockReturnValue(authState({ user: null }));

    renderSwitcher(true);

    await act(async () => {});

    expect(executeMock).not.toHaveBeenCalled();
  });

  it('keeps the previous list and logs when a reload fails', async () => {
    executeMock.mockResolvedValueOnce([household('h1', 'Home')]);

    const { result, rerender } = renderSwitcher(true);
    await waitFor(() => expect(result.current.households).toHaveLength(1));

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('offline');
    executeMock.mockRejectedValueOnce(failure);

    // Close then reopen so the effect runs again and reloads.
    rerender({ open: false });
    rerender({ open: true });

    await waitFor(() => expect(executeMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Error fetching households:', failure),
    );

    expect(result.current.households.map((h) => h.id)).toEqual(['h1']);
    expect(result.current.loading).toBe(false);
  });
});
