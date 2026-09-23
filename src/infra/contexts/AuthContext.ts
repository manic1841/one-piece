import { createContext } from 'react';

import { type User } from 'firebase/auth';

import { type UserProfile } from '@/domains/user/schemas';

//
export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  /** 設定表示 auth 初始化失敗（後端不可達等），UI 應顯示失敗畫面而非永久等待。 */
  initError: string | null;
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
  initError: null,
  logout: async () => {},
  loginWithGoogle: async () => {},
  refreshProfile: async () => {},
});
