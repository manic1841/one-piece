import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizeRouteAccessUseCase } from '@/application/auth/use_cases/authorizeRouteAccessUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { useRouteAuthorization } from './useRouteAuthorization';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: vi.fn(),
}));

vi.mock('@/application/auth/use_cases/authorizeRouteAccessUseCase', () => ({
  authorizeRouteAccessUseCase: { execute: vi.fn() },
}));

type AuthState = ReturnType<typeof useAuthState>;

const authState = (overrides: Partial<AuthState> = {}): AuthState =>
  ({
    user: { uid: 'user-1', email: 'user@example.com' },
    userProfile: { householdId: 'household-1' },
    profileLoading: false,
    isAdmin: false,
    loading: false,
    initError: null,
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  }) as AuthState;

const identity = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };

describe('useRouteAuthorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthState).mockReturnValue(authState());
    vi.mocked(useAuthIdentity).mockReturnValue(identity);
    vi.mocked(authorizeRouteAccessUseCase.execute).mockResolvedValue('allow');
  });

  it('reports pending while auth is still initialising and asks nothing of the workflow', () => {
    vi.mocked(useAuthState).mockReturnValue(authState({ loading: true }));

    const { result } = renderHook(() => useRouteAuthorization(false));

    expect(result.current.outcome).toBe('pending');
    expect(authorizeRouteAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('reports unauthenticated when nobody is signed in', () => {
    vi.mocked(useAuthIdentity).mockReturnValue({ uid: '', email: '' });

    const { result } = renderHook(() => useRouteAuthorization(false));

    expect(result.current.outcome).toBe('unauthenticated');
    expect(authorizeRouteAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('delegates to the workflow with the identity and profile household', async () => {
    vi.mocked(authorizeRouteAccessUseCase.execute).mockResolvedValue('onboarding');

    const { result } = renderHook(() => useRouteAuthorization(true));

    await waitFor(() => expect(result.current.outcome).toBe('onboarding'));
    expect(authorizeRouteAccessUseCase.execute).toHaveBeenCalledWith({
      auth: identity,
      householdId: 'household-1',
      requireHousehold: true,
    });
  });

  it('stays pending while the profile read is still resolving after init finished', async () => {
    vi.mocked(useAuthState).mockReturnValue(
      authState({ userProfile: null, profileLoading: true, loading: false }) as AuthState,
    );

    const { result } = renderHook(() => useRouteAuthorization(true));

    expect(result.current.outcome).toBe('pending');
    expect(authorizeRouteAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('runs the workflow once the profile resolves to a household', async () => {
    vi.mocked(useAuthState).mockReturnValue(
      authState({ userProfile: null, profileLoading: true, loading: false }) as AuthState,
    );
    const { result, rerender } = renderHook(() => useRouteAuthorization(true));

    expect(result.current.outcome).toBe('pending');

    vi.mocked(useAuthState).mockReturnValue(authState() as AuthState);
    rerender();

    await waitFor(() => expect(result.current.outcome).toBe('allow'));
    expect(authorizeRouteAccessUseCase.execute).toHaveBeenCalledWith({
      auth: identity,
      householdId: 'household-1',
      requireHousehold: true,
    });
  });

  it('fails closed to access-denied when the workflow throws', async () => {
    vi.mocked(authorizeRouteAccessUseCase.execute).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRouteAuthorization(false));

    await waitFor(() => expect(result.current.outcome).toBe('access-denied'));
  });
});
