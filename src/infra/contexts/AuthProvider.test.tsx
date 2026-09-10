import { act, renderHook, waitFor } from '@testing-library/react';
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
 * Renders AuthProvider and captures the onAuthStateChanged callback so the test
 * can fire it explicitly. This mirrors how the real Firebase SDK invokes the
 * listener, letting us control timing precisely.
 */
const renderAuthProvider = async () => {
  let authCallback: ((user: User | null) => void) | null = null;
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
    authCallback = cb;
    return () => {};
  });

  const { AuthProvider } = await import('@/infra/contexts/AuthProvider');
  const { useAuth } = await import('@/infra/contexts/useAuth');

  const result = renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });

  return { result, getAuthCallback: () => authCallback };
};

describe('AuthProvider profile initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a profile on first login when none exists', async () => {
    const user = mockUser();

    vi.mocked(getUserProfileUseCase.execute)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseProfile);

    vi.mocked(createUserProfileUseCase.execute).mockResolvedValue('user-1');

    const { result, getAuthCallback } = await renderAuthProvider();

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => {
      expect(result.current.userProfile).not.toBeNull();
    });

    expect(createUserProfileUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createUserProfileUseCase.execute).toHaveBeenCalledWith({
      profile: expect.objectContaining({
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
      }),
    });
    expect(result.current.userProfile).toMatchObject({ uid: 'user-1' });
  });

  it('refreshes an existing profile and admin claims without creating a new one', async () => {
    const user = mockUser();

    const existingProfile = { ...baseProfile, householdId: 'household-1' };
    vi.mocked(getUserProfileUseCase.execute).mockResolvedValue(existingProfile);

    const { result, getAuthCallback } = await renderAuthProvider();

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => {
      expect(result.current.userProfile).not.toBeNull();
    });

    expect(createUserProfileUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.userProfile).toMatchObject({
      uid: 'user-1',
      householdId: 'household-1',
    });
    expect(result.current.isAdmin).toBe(true);
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

    vi.mocked(createUserProfileUseCase.execute).mockResolvedValue('user-1');

    const { result, getAuthCallback } = await renderAuthProvider();

    let createdDuringCallback = false;
    vi.mocked(createUserProfileUseCase.execute).mockImplementation(async () => {
      createdDuringCallback = true;
      return 'user-1';
    });

    await act(async () => {
      await getAuthCallback()?.(user);
    });

    await waitFor(() => {
      expect(result.current.userProfile).not.toBeNull();
    });

    // Profile creation must have occurred during the first auth callback,
    // not skipped due to a stale null closure value.
    expect(createdDuringCallback).toBe(true);
    expect(result.current.userProfile).toMatchObject({ uid: 'user-1' });
  });
});

