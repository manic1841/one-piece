import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
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

import { type AuthGatewaySnapshot } from '@/domains/auth/authGateway';
import { auth } from '@/firebase';

import { firebaseAuthGateway } from './firebaseAuthGateway';

const AUTH_INIT_TIMEOUT_MS = 10_000;

const mockFirebaseUser = (overrides: Record<string, unknown> = {}) => ({
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.png',
  getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
  ...overrides,
});

/** Captures the snapshot callback so a test can fire it explicitly. */
const subscribe = () => {
  let callback: ((user: unknown) => Promise<void>) | null = null;
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
    callback = cb as unknown as (user: unknown) => Promise<void>;
    return () => {};
  });

  const snapshots: AuthGatewaySnapshot[] = [];
  const unsubscribe = firebaseAuthGateway.subscribe((snapshot) => snapshots.push(snapshot));

  return { fire: () => callback, snapshots, unsubscribe };
};

describe('firebaseAuthGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as { currentUser?: unknown }).currentUser = null;
  });

  it('maps a signed-in SDK user to AuthUser, admin claim and a profile seed', async () => {
    const { fire, snapshots } = subscribe();

    await fire()?.(mockFirebaseUser());

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      user: { uid: 'user-1', email: 'user@example.com' },
      isAdmin: true,
      initError: null,
      profileSeed: { displayName: 'Test User', photoURL: 'https://example.com/photo.png' },
    });
  });

  it('absorbs SDK nulls instead of leaking them into the contract', async () => {
    const { fire, snapshots } = subscribe();

    await fire()?.(mockFirebaseUser({ email: null, displayName: null, photoURL: null }));

    // `AuthUser` is a UI-facing projection: no nulls survive the mapping.
    expect(snapshots[0].user).toEqual({ uid: 'user-1', email: '' });
    expect(snapshots[0].profileSeed).toEqual({ displayName: '', photoURL: undefined });
  });

  it('emits an unauthenticated snapshot when nobody is signed in', async () => {
    const { fire, snapshots } = subscribe();

    await fire()?.(null);

    expect(snapshots[0]).toMatchObject({ user: null, isAdmin: false, initError: null });
  });

  it('emits a failure snapshot when the SDK never calls back', () => {
    vi.useFakeTimers();
    try {
      // The unreachable-backend case: onAuthStateChanged registers but never fires.
      vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});

      const snapshots: AuthGatewaySnapshot[] = [];
      firebaseAuthGateway.subscribe((snapshot) => snapshots.push(snapshot));

      expect(snapshots).toHaveLength(0);

      vi.advanceTimersByTime(AUTH_INIT_TIMEOUT_MS);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        user: null,
        isAdmin: false,
        initError: 'auth-backend-unreachable',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not time out once the SDK has reported', async () => {
    vi.useFakeTimers();
    try {
      const { fire, snapshots } = subscribe();

      await fire()?.(mockFirebaseUser());
      vi.advanceTimersByTime(AUTH_INIT_TIMEOUT_MS);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].initError).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads the admin claim with an explicit refresh', async () => {
    const getIdTokenResult = vi.fn().mockResolvedValue({ claims: { role: 'admin' } });
    (auth as { currentUser?: unknown }).currentUser = { getIdTokenResult };

    await expect(firebaseAuthGateway.getIsAdmin(true)).resolves.toBe(true);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });

  it('reports no admin when there is no signed-in user', async () => {
    await expect(firebaseAuthGateway.getIsAdmin(false)).resolves.toBe(false);
  });

  it('delegates login and logout to the SDK', async () => {
    await firebaseAuthGateway.loginWithGoogle();
    await firebaseAuthGateway.logout();

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
