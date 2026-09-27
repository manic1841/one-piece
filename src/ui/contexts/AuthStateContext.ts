import { createContext } from 'react';

import { type AuthInitErrorCode } from '@/domains/auth/authInitError';
import { type AuthUser } from '@/domains/auth/identity';
import { type UserProfile } from '@/domains/auth/user/types';

/**
 * UI 端的認證狀態。與 `@/application/types` 的 `AuthContext`（use case 消費的埠）是**不同東西**，
 * 因此刻意不叫 `AuthContext`（issue #177 定案 Q4）。
 *
 * `AuthUser`（身分，同步）與 `UserProfile`（家庭紀錄，非同步）刻意是兩個可獨立為 null 的欄位。
 */
export interface AuthState {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  /** 非 null 表示 auth 初始化失敗（後端不可達等），UI 應顯示失敗畫面而非永久等待。 */
  initError: AuthInitErrorCode | null;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthStateContext = createContext<AuthState>({
  user: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
  initError: null,
  logout: async () => {},
  loginWithGoogle: async () => {},
  refreshProfile: async () => {},
});
