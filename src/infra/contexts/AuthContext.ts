import { createContext } from 'react';

import { type User } from 'firebase/auth';

import { type UserProfile } from '@/domains/user/schemas';

//
export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

//
export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  loginWithGoogle: async () => {},
  refreshProfile: async () => {},
});
