import { type User } from 'firebase/auth';
import { createContext } from 'react';

import { type UserProfile } from '../schemas';

// context 型別
export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// 建立 context，初始值佔位
export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  loginWithGoogle: async () => {},
  refreshProfile: async () => {},
});
