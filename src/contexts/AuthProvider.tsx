import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';

import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { RoleEnum } from '@/domains/auth/role';
import { auth, googleProvider } from '@/firebase';
import { type UserProfile } from '@/schemas';
import { userService } from '@/services/userService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

        // If profile doesn't exist, create one with guest role
        if (!profile && currentUser) {
          const newProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: getDisplayName(currentUser),
            photoURL: currentUser.photoURL || undefined,
            role: RoleEnum.GUEST,
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
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser.uid);
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
