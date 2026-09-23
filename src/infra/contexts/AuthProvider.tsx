import React, { useCallback, useEffect, useState } from 'react';

import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { createUserProfileUseCase } from '@/application/user/use_cases/createUserProfileUseCase';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { type UserProfile } from '@/domains/user/schemas';
import { auth, googleProvider } from '@/firebase';
import {
  AuthContext,
  type AuthContextType,
  type AuthInitErrorCode,
} from '@/infra/contexts/AuthContext';

/**
 * `onAuthStateChanged` 在後端不可達時永遠不會回呼，`loading` 若只依賴它便會無限等待
 * （畫面全空）。超過此時間仍未取得第一次回呼即視為初始化失敗。
 */
const AUTH_INIT_TIMEOUT_MS = 10_000;

/**
 * 逾時時放上 context 的錯誤碼。這裡只放**資料**，不 render UI：顯示文字由 UI 決定
 * （`AuthGate` + `constants`，見 docs/ui/ui-layer-architecture.md §5.1、ADR-0062 規則 10）。
 */
const AUTH_INIT_TIMEOUT_ERROR: AuthInitErrorCode = 'auth-backend-unreachable';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<AuthInitErrorCode | null>(null);

  const getDisplayName = (user: User): string => {
    if (user.displayName && user.displayName.trim() !== '') {
      return user.displayName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Anonymous';
  };

  const fetchUserProfile = useCallback(async (uid: string, user?: User | null) => {
    try {
      let profile = await getUserProfileUseCase.execute({ uid });

      // If profile doesn't exist, create one using the explicitly-passed User
      // rather than closure-captured currentUser, which may be stale on the
      // first onAuthStateChanged callback before React flushes state.
      if (!profile && user) {
        const newProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: getDisplayName(user),
          photoURL: user.photoURL || undefined,
        };
        // Save the profile to Firestore
        await createUserProfileUseCase.execute({ profile: newProfile });

        profile = await getUserProfileUseCase.execute({ uid });
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setInitError(AUTH_INIT_TIMEOUT_ERROR);
      console.error(`[AuthProvider] No auth state after ${AUTH_INIT_TIMEOUT_MS}ms.`);
    }, AUTH_INIT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      window.clearTimeout(timeoutId);
      setInitError(null);
      setCurrentUser(user);
      if (user) {
        // Fetch custom claims to check for admin role
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.role === 'admin');
        await fetchUserProfile(user.uid, user);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [fetchUserProfile]);

  const refreshProfile = async () => {
    if (currentUser) {
      const tokenResult = await currentUser.getIdTokenResult(true);
      setIsAdmin(tokenResult.claims.role === 'admin');
      await fetchUserProfile(currentUser.uid, currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setIsAdmin(false);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    isAdmin,
    loading,
    initError,
    logout,
    loginWithGoogle,
    refreshProfile,
  };

  // 永遠掛載 provider：失敗與載入狀態都是**資料**，由 UI 端（`AuthGate`）決定要
  // 顯示失敗畫面、等待，或放行 children。infra 不得 import `src/ui/**`。
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
