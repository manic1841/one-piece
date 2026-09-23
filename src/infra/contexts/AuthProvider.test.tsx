import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock('@/application/user/use_cases/getUserProfileUseCase', () => ({
  getUserProfileUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/user/use_cases/createUserProfileUseCase', () => ({
  createUserProfileUseCase: {
    execute: vi.fn(),
  },
}));

import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { createUserProfileUseCase } from '@/application/user/use_cases/createUserProfileUseCase';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.png',
    getIdTokenResult: vi.fn().mockResolvedValue({
      claims: { role: 'admin' },
    }),
    ...overrides,
  }) as unknown as User;

const baseProfile = {
  id: 'user-1',
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  createdBy: 'system',
  createdAt: new Date(),
  updatedBy: 'system',
  updatedAt: new Date(),
};

/**
 * Renders AuthProvider with a probe child that reads AuthContext. The probe
 * only mounts once AuthProvider's `loading` state flips to false (after the
 * auth callback fires), so tests use `waitFor` to observe the context value.
 *
 * Returns the auth callback so the test can fire it explicitly, and a
 * `getProbeValue` accessor to read the latest context value.
 */
const renderAuthProvider = async () => {
  let authCallback: ((user: User | null) => void) | null = null;
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
    authCallback = cb;
    return () => {};
  });

  const { AuthProvider } = await import('@/infra/contexts/AuthProvider');
  const { AuthContext } = await import('@/infra/contexts/AuthContext');
  type AuthContextType = import('@/infra/contexts/AuthContext').AuthContextType;

  const probeRef: { current: AuthContextType | null } = { current: null };
  const Probe = React.memo(function Probe() {
    const value = React.useContext(AuthContext);
    React.useEffect(() => {
      probeRef.current = value;
    }, [value]);
    return null;
  });

  render(React.createElement(AuthProvider, null, React.createElement(Probe)));

  return { getAuthCallback: () => authCallback, getProbeValue: () => probeRef.current };
};

describe('AuthProvider profile initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });  it('creates a profile on first login when none exists', async () => {
    const user = mockUser();

    vi.mocked(getUserProfileUseCase.execute)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseProfile);

    vi.mocked(createUserProfileUseCase.execute).mockResolvedValue('user-1');

    const { getAuthCallback, getProbeValue } = await renderAuthProvider();

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => expect(getProbeValue()).toBeTruthy());
    await waitFor(() => {
      expect(getProbeValue()?.userProfile).not.toBeNull();
    });

    expect(createUserProfileUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createUserProfileUseCase.execute).toHaveBeenCalledWith({
      profile: expect.objectContaining({
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
      }),
    });
    expect(getProbeValue()?.userProfile).toMatchObject({ uid: 'user-1' });
  });

  it('refreshes an existing profile and admin claims without creating a new one', async () => {
    const user = mockUser();

    const existingProfile = { ...baseProfile, householdId: 'household-1' };
    vi.mocked(getUserProfileUseCase.execute).mockResolvedValue(existingProfile);

    const { getAuthCallback, getProbeValue } = await renderAuthProvider();

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => expect(getProbeValue()).toBeTruthy());
    await waitFor(() => {
      expect(getProbeValue()?.userProfile).not.toBeNull();
    });

    expect(createUserProfileUseCase.execute).not.toHaveBeenCalled();
    expect(getProbeValue()?.userProfile).toMatchObject({
      uid: 'user-1',
      householdId: 'household-1',
    });
    expect(getProbeValue()?.isAdmin).toBe(true);
  });

  it('creates a profile deterministically on first login even when closure state is stale', async () => {
    // #35 bug: fetchUserProfile reads `currentUser` from a useCallback closure.
    // On the first onAuthStateChanged callback, setCurrentUser(user) has been
    // called but the closure still holds the previous value (null), so the
    // `if (!profile && currentUser)` guard fails and no profile is created.
    //
    // This test fires the auth callback exactly once and asserts that profile
    // creation happens inside that single callback — proving the use case
    // receives the User explicitly rather than relying on stale closure state.
    const user = mockUser({ displayName: null, photoURL: null });

    const createdProfile = { ...baseProfile, displayName: 'user' };
    vi.mocked(getUserProfileUseCase.execute)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdProfile);

    let createdDuringCallback = false;
    vi.mocked(createUserProfileUseCase.execute).mockImplementation(async () => {
      createdDuringCallback = true;
      return 'user-1';
    });

    const { getAuthCallback, getProbeValue } = await renderAuthProvider();

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => expect(getProbeValue()).toBeTruthy());
    await waitFor(() => {
      expect(getProbeValue()?.userProfile).not.toBeNull();
    });

    // Profile creation must have occurred during the first auth callback,
    // not skipped due to a stale null closure value.
    expect(createdDuringCallback).toBe(true);
    expect(getProbeValue()?.userProfile).toMatchObject({ uid: 'user-1' });
  });
});

/**
 * Renders AuthProvider with a probe child and a `app` marker child, without ever
 * firing the auth callback (the backend-unreachable case). Returns a ref holding
 * the latest context value.
 */
const renderProviderWithProbe = async () => {
  vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});

  const { AuthProvider } = await import('@/infra/contexts/AuthProvider');
  const { AuthContext } = await import('@/infra/contexts/AuthContext');
  type AuthContextType = import('@/infra/contexts/AuthContext').AuthContextType;

  const probeRef: { current: AuthContextType | null } = { current: null };
  const Probe = React.memo(function Probe() {
    const value = React.useContext(AuthContext);
    React.useEffect(() => {
      probeRef.current = value;
    }, [value]);
    return null;
  });

  render(
    React.createElement(
      AuthProvider,
      null,
      React.createElement('div', null, 'app'),
      React.createElement(Probe),
    ),
  );

  return probeRef;
};

describe('AuthProvider initialization failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always mounts the provider and its children, never returning early', async () => {
    vi.useFakeTimers();
    try {
      const probeRef = await renderProviderWithProbe();

      // The provider is the only thing infra may decide here: children mount and
      // the failure state travels as data. Rendering the failure screen is the
      // UI's job (AuthGate).
      expect(screen.getByText('app')).toBeInTheDocument();
      expect(probeRef.current?.loading).toBe(true);
      expect(probeRef.current?.initError).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces an unreachable backend as an error code on the context', async () => {
    vi.useFakeTimers();
    try {
      // onAuthStateChanged registers a callback but never fires it, which is what
      // happens when the backend is unreachable (emulator down, no network).
      const probeRef = await renderProviderWithProbe();

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(probeRef.current?.initError).toBe('auth-backend-unreachable');
      // Children stay mounted so the UI gate can render the failure screen.
      expect(screen.getByText('app')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
