import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    type User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

import { householdService } from '../services/householdService';

interface AuthContextType {
    currentUser: User | null;
    userProfile: any | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

// @ts-expect-error - Initial context value is partial but will be filled by provider
const AuthContext = createContext<AuthContextType>({ currentUser: null, userProfile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (uid: string) => {
        try {
            const profile = await householdService.getUserProfile(uid);
            setUserProfile(profile);
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUserProfile(null);
        }
    };

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
    }, []);

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

    const value = {
        currentUser,
        userProfile,
        loading,
        login,
        signup,
        logout,
        loginWithGoogle,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
