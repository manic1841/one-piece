import { createContext } from 'react';

import { type User } from 'firebase/auth';

import { type UserProfile } from '@/domains/auth/user/schemas';

/**
 * 啟動期不可回復失敗的錯誤碼。infra 只給碼，顯示文字由 UI 決定
 * （見 docs/ui/ui-layer-architecture.md §5.1）；UI 端以同構的
 * `StartupFailureCode` 對照 `STARTUP_FAILURE_COPY`，兩邊的鍵由測試釘住。
 */
export const AUTH_INIT_ERROR_CODES = ['auth-backend-unreachable'] as const;

export type AuthInitErrorCode = (typeof AUTH_INIT_ERROR_CODES)[number];

//
export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  /** 非 null 表示 auth 初始化失敗（後端不可達等），UI 應顯示失敗畫面而非永久等待。 */
  initError: AuthInitErrorCode | null;
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
