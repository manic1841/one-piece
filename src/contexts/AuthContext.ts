import { createContext } from 'react';

import { type User } from 'firebase/auth';

import { type UserProfile } from '../schemas';

// context 型別
export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// 建立 context，初始值佔位
export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  loginWithGoogle: async () => {},
  refreshProfile: async () => {},
});
