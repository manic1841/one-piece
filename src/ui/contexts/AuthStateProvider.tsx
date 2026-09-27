import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ensureUserProfileUseCase } from '@/application/auth/use_cases/ensureUserProfileUseCase';
import { type AuthGateway } from '@/domains/auth/authGateway';
import { type AuthInitErrorCode } from '@/domains/auth/authInitError';
import { type AuthUser } from '@/domains/auth/identity';
import { type UserProfile } from '@/domains/auth/user/types';

import { type AuthState, AuthStateContext } from './AuthStateContext';

interface AuthStateProviderProps {
  gateway: AuthGateway;
  children: React.ReactNode;
}

/**
 * UI 自有的認證 provider（Controller 層）。
 *
 * gateway 由外部注入（`src/App.tsx` 是 composition root，見 issue #177 定案 Q1/Q27），
 * 因此本檔與整個 `src/ui/**` 都不必 import `@/infra`。
 *
 * 永遠掛載 provider：失敗與載入狀態都是**資料**，由 UI 端的 `AuthGate` 決定要顯示
 * 失敗畫面、等待，或放行 children（見 docs/ui/ui-layer-architecture.md §5.1）。
 */
export const AuthStateProvider: React.FC<AuthStateProviderProps> = ({ gateway, children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<AuthInitErrorCode | null>(null);
  const profileSeedRef = useRef<{ displayName: string; photoURL?: string }>({ displayName: '' });

  const ensureProfile = useCallback(async (target: AuthUser) => {
    const seed = profileSeedRef.current;
    try {
      const profile = await ensureUserProfileUseCase.execute({
        uid: target.uid,
        email: target.email,
        displayName: seed.displayName,
        photoURL: seed.photoURL,
      });
      setUserProfile(profile);
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = gateway.subscribe((snapshot) => {
      profileSeedRef.current = snapshot.profileSeed;
      setInitError(snapshot.initError);
      setUser(snapshot.user);
      setIsAdmin(snapshot.isAdmin);

      if (snapshot.initError) {
        // 初始化從未落定，因此 `loading` 保持 true：這個狀態讀作「仍在初始化，而且失敗了」。
        // `AuthGate` 的失敗分支優先於載入分支，所以畫面不會卡在等待（見 §5.1）。
        return;
      }

      setLoading(false);

      if (snapshot.user) {
        void ensureProfile(snapshot.user);
      } else {
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, [gateway, ensureProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setIsAdmin(await gateway.getIsAdmin(true));
    await ensureProfile(user);
  }, [gateway, user, ensureProfile]);

  const logout = useCallback(async () => {
    await gateway.logout();
    setUserProfile(null);
    setIsAdmin(false);
  }, [gateway]);

  const loginWithGoogle = useCallback(async () => {
    await gateway.loginWithGoogle();
  }, [gateway]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      userProfile,
      isAdmin,
      loading,
      initError,
      logout,
      loginWithGoogle,
      refreshProfile,
    }),
    [user, userProfile, isAdmin, loading, initError, logout, loginWithGoogle, refreshProfile],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
};
