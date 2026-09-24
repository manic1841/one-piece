import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/auth/use_cases/ensureUserProfileUseCase', () => ({
  ensureUserProfileUseCase: { execute: vi.fn() },
}));

import { ensureUserProfileUseCase } from '@/application/auth/use_cases/ensureUserProfileUseCase';
import { type AuthGateway, type AuthGatewaySnapshot } from '@/domains/auth/authGateway';

import { AuthStateContext, type AuthState } from './AuthStateContext';
import { AuthStateProvider } from './AuthStateProvider';

/**
 * A fake gateway: the UI provider must be testable without any Firebase (issue #177 Q23).
 * The infra implementation has its own test (`firebaseAuthGateway.test.ts`).
 */
const createFakeGateway = () => {
  let listener: ((snapshot: AuthGatewaySnapshot) => void) | null = null;

  const gateway: AuthGateway = {
    subscribe: vi.fn((onSnapshot) => {
      listener = onSnapshot;
      return () => {
        listener = null;
      };
    }),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getIsAdmin: vi.fn().mockResolvedValue(false),
  };

  return {
    gateway,
    emit: (snapshot: AuthGatewaySnapshot) => listener?.(snapshot),
    isSubscribed: () => listener !== null,
  };
};

const profile = {
  id: 'user-1',
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  householdId: 'household-1',
  createdBy: 'system',
  createdAt: new Date(),
  updatedBy: 'system',
  updatedAt: new Date(),
};

const signedIn: AuthGatewaySnapshot = {
  user: { uid: 'user-1', email: 'user@example.com' },
  isAdmin: true,
  initError: null,
  profileSeed: { displayName: 'Test User' },
};

const renderProvider = (gateway: AuthGateway) => {
  const probeRef: { current: AuthState | null } = { current: null };
  const Probe = React.memo(function Probe() {
    const value = React.useContext(AuthStateContext);
    React.useEffect(() => {
      probeRef.current = value;
    }, [value]);
    return null;
  });

  render(
    <AuthStateProvider gateway={gateway}>
      <div>app</div>
      <Probe />
    </AuthStateProvider>,
  );

  return { getValue: () => probeRef.current };
};

describe('AuthStateProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureUserProfileUseCase.execute).mockResolvedValue(profile);
  });

  it('always mounts its children and starts in the loading state', () => {
    const { gateway } = createFakeGateway();
    const { getValue } = renderProvider(gateway);

    // The provider is never allowed to return early: failure and loading are data,
    // and rendering the failure screen is AuthGate's job (see #176 / §5.1).
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(getValue()?.loading).toBe(true);
    expect(getValue()?.initError).toBeNull();
  });

  it('projects a signed-in snapshot into user, isAdmin and the profile', async () => {
    const { gateway, emit } = createFakeGateway();
    const { getValue } = renderProvider(gateway);

    await act(async () => {
      emit(signedIn);
    });

    await waitFor(() => expect(getValue()?.userProfile).not.toBeNull());

    expect(getValue()).toMatchObject({
      user: { uid: 'user-1', email: 'user@example.com' },
      isAdmin: true,
      loading: false,
      initError: null,
    });
    expect(ensureUserProfileUseCase.execute).toHaveBeenCalledWith({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: undefined,
    });
  });

  it('surfaces the failure code and keeps the children mounted', async () => {
    const { gateway, emit } = createFakeGateway();
    const { getValue } = renderProvider(gateway);

    await act(async () => {
      // The real unreachable-backend state: the timeout sets the code while
      // loading never clears, because the SDK callback never fires.
      emit({
        user: null,
        isAdmin: false,
        initError: 'auth-backend-unreachable',
        profileSeed: { displayName: '' },
      });
    });

    expect(getValue()?.initError).toBe('auth-backend-unreachable');
    expect(getValue()?.loading).toBe(true);
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(ensureUserProfileUseCase.execute).not.toHaveBeenCalled();
  });

  it('clears the profile and admin flag on logout', async () => {
    const { gateway, emit } = createFakeGateway();
    const { getValue } = renderProvider(gateway);

    await act(async () => {
      emit(signedIn);
    });
    await waitFor(() => expect(getValue()?.userProfile).not.toBeNull());

    await act(async () => {
      await getValue()?.logout();
    });

    expect(gateway.logout).toHaveBeenCalledTimes(1);
    expect(getValue()).toMatchObject({ userProfile: null, isAdmin: false });
  });

  it('refreshes admin claims through the gateway', async () => {
    const { gateway, emit } = createFakeGateway();
    const { getValue } = renderProvider(gateway);

    await act(async () => {
      emit(signedIn);
    });

    vi.mocked(gateway.getIsAdmin).mockResolvedValue(false);

    await act(async () => {
      await getValue()?.refreshProfile();
    });

    expect(gateway.getIsAdmin).toHaveBeenCalledWith(true);
    expect(getValue()?.isAdmin).toBe(false);
  });

  it('unsubscribes from the gateway on unmount', () => {
    const { gateway, isSubscribed } = createFakeGateway();

    const { unmount } = render(
      <AuthStateProvider gateway={gateway}>
        <div>app</div>
      </AuthStateProvider>,
    );

    expect(isSubscribed()).toBe(true);

    unmount();

    expect(isSubscribed()).toBe(false);
  });
});
