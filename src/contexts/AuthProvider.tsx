import React, { useCallback, useEffect, useState } from 'react';

import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { auth, googleProvider } from '@/firebase';
import { type UserProfile } from '@/schemas';
import { userService } from '@/services/userService';

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
        const profile = await userService.getUserProfile(uid);

        // If profile doesn't exist, create one
        if (!profile && currentUser) {
          const newProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: getDisplayName(currentUser),
            photoURL: currentUser.photoURL || undefined,
          };
          // Save the profile to Firestore
          await userService.createUserProfile(newProfile);
        }

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
