import React, { useCallback, useEffect, useState } from 'react';

import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { createUserProfileUseCase } from '@/application/user/use_cases/createUserProfileUseCase';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { type UserProfile } from '@/domains/user/schemas';
import { auth, googleProvider } from '@/firebase';
import { AuthContext, type AuthContextType } from '@/infra/contexts/AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const getDisplayName = (user: User): string => {
    if (user.displayName && user.displayName.trim() !== '') {
      return user.displayName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Anonymous';
  };

  const fetchUserProfile = useCallback(
    async (uid: string) => {
      try {
        console.log('fetchUserProfile', uid);
        let profile = await getUserProfileUseCase.execute({ uid });
        console.log('profile', profile);
        console.log('currentUser', currentUser);

        // If profile doesn't exist, create one
        if (!profile && currentUser) {
          console.log('create profile');
          const newProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: getDisplayName(currentUser),
            photoURL: currentUser.photoURL || undefined,
          };
          // Save the profile to Firestore
          await createUserProfileUseCase.execute({ profile: newProfile });
          console.log('after created');

          profile = await getUserProfileUseCase.execute({ uid });
          console.log('get profile:', profile);
        }
        console.log('profile', profile);

        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      }
    },
    [currentUser],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch custom claims to check for admin role
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.role === 'admin');
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const refreshProfile = async () => {
    if (currentUser) {
      const tokenResult = await currentUser.getIdTokenResult(true);
      setIsAdmin(tokenResult.claims.role === 'admin');
      await fetchUserProfile(currentUser.uid);
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
    logout,
    loginWithGoogle,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
