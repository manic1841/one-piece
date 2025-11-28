import React, { useState, useEffect, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { householdService } from '../services/householdService';
import { type UserProfile } from '../schemas';
import { AuthContext, type AuthContextType } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(
    async (uid: string) => {
      try {
        let profile = await householdService.getUserProfile(uid);

        // If profile doesn't exist, create one with guest role
        if (!profile && currentUser) {
          profile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || '',
            photoURL: currentUser.photoURL || undefined,
            role: 'guest' as const,
          };

          // Save the profile to Firestore
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, profile);
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
