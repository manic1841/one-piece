import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { AUTH_BACKEND_UNREACHABLE } from '@/domains/auth/authInitError';
import {
  type AuthGateway,
  type AuthGatewaySnapshot,
} from '@/domains/auth/authGateway';
import { type AuthUser } from '@/domains/auth/identity';
import { auth, googleProvider } from '@/firebase';

/**
 * `onAuthStateChanged` 在後端不可達時永遠不會回呼，若只依賴它便會無限等待（畫面全空）。
 * 超過此時間仍未取得第一次回呼即視為初始化失敗。這是 infra 的觀測政策。
 */
const AUTH_INIT_TIMEOUT_MS = 10_000;

const EMPTY_PROFILE_SEED = { displayName: '' };

/** SDK 的 `string | null` 在此消化掉：`AuthUser` 刻意不保留 null（見 domains/auth/identity.ts）。 */
const toAuthUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email ?? '',
});

const isAdminClaim = (claims: Record<string, unknown>): boolean => claims.role === 'admin';

/**
 * Firebase 實作。**所有 Firebase 細節都關在這個檔案裡**：UI 只認識
 * `AuthGateway`（domain 的埠）與 `AuthUser`（domain 的契約），
 * 因此 `src/ui/**` 對 `@/infra` 的 import 可以是零（issue #177）。
 *
 * 這個實作由 `src/App.tsx`（composition root）注入 UI 的 provider。
 */
export const firebaseAuthGateway: AuthGateway = {
  subscribe(onSnapshot) {
    const timeoutId = window.setTimeout(() => {
      onSnapshot({
        user: null,
        isAdmin: false,
        initError: AUTH_BACKEND_UNREACHABLE,
        profileSeed: EMPTY_PROFILE_SEED,
      });
      console.error(`[firebaseAuthGateway] No auth state after ${AUTH_INIT_TIMEOUT_MS}ms.`);
    }, AUTH_INIT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      window.clearTimeout(timeoutId);

      if (!user) {
        onSnapshot({
          user: null,
          isAdmin: false,
          initError: null,
          profileSeed: EMPTY_PROFILE_SEED,
        });
        return;
      }

      const tokenResult = await user.getIdTokenResult();
      const snapshot: AuthGatewaySnapshot = {
        user: toAuthUser(user),
        isAdmin: isAdminClaim(tokenResult.claims),
        initError: null,
        profileSeed: {
          displayName: user.displayName ?? '',
          photoURL: user.photoURL ?? undefined,
        },
      };
      onSnapshot(snapshot);
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  },

  async loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  },

  async logout() {
    await signOut(auth);
  },

  async getIsAdmin(forceRefresh) {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
    return isAdminClaim(tokenResult.claims);
  },
};
