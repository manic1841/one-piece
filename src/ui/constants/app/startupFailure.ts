import { type AuthInitErrorCode } from '@/domains/auth/authInitError';

/**
 * 啟動失敗（讓 app 進不去的初始化失敗）的顯示文字。
 *
 * 錯誤碼本身是**單一宣告**（`@/domains/auth/authInitError`）——infra 與 UI 都由此 import，
 * 不再各自鏡射一份同構 union（issue #177 定案 Q10）。`Record` 的鍵即為完整性保證：
 * 新增錯誤碼而沒有文案時，`tsc` 就會擋下來，不需要額外的 parity 測試。
 *
 * infra 仍然只給碼，文案住在 UI（見 `docs/ui/ui-layer-architecture.md` §5.1）。
 */
export interface StartupFailureCopy {
  title: string;
  description: string;
  hint?: string;
}

export const STARTUP_FAILURE_COPY: Record<AuthInitErrorCode, StartupFailureCopy> = {
  'auth-backend-unreachable': {
    title: 'Cannot reach the backend',
    description: 'The app could not reach the authentication backend.',
    hint: 'Local dev: is the Firebase emulator running? See docs/qa-faq.md.',
  },
};
