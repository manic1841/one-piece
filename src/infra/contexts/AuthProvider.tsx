import React, { useCallback, useEffect, useState } from 'react';

import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { createUserProfileUseCase } from '@/application/user/use_cases/createUserProfileUseCase';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { type UserProfile } from '@/domains/user/schemas';
import { auth, googleProvider } from '@/firebase';
import { AuthContext, type AuthContextType } from '@/infra/contexts/AuthContext';
import { AppFallback } from '@/ui/components/AppFallback';

/**
 * `onAuthStateChanged` 在後端不可達時永遠不會回呼，`loading` 若只依賴它便會無限等待
 * （畫面全空）。超過此時間仍未取得第一次回呼即視為初始化失敗。
 */
const AUTH_INIT_TIMEOUT_MS = 10_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

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
      setInitError('The app could not reach the authentication backend.');
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

  if (initError) {
    return (
      <AppFallback
        title="Cannot reach the backend"
        description={initError}
        hint="Local dev: is the Firebase emulator running? See docs/qa-faq.md."
      />
    );
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
