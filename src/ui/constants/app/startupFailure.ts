/**
 * 啟動失敗（讓 app 進不去的初始化失敗）的顯示文字。
 *
 * infra 只給錯誤碼，文案住在 UI（見 `docs/ui/ui-layer-architecture.md` §5.1）。
 * `StartupFailureCode` 刻意與 infra 的 `AuthInitErrorCode` 同構而不共用型別——
 * `constants` 不得 import `@/infra`（ADR-0062）；兩邊的鍵由
 * `startupFailure.test.ts` 釘住，新增錯誤碼時測試會失敗。
 */
export type StartupFailureCode = 'auth-backend-unreachable';

export interface StartupFailureCopy {
  title: string;
  description: string;
  hint?: string;
}

export const STARTUP_FAILURE_COPY: Record<StartupFailureCode, StartupFailureCopy> = {
  'auth-backend-unreachable': {
    title: 'Cannot reach the backend',
    description: 'The app could not reach the authentication backend.',
    hint: 'Local dev: is the Firebase emulator running? See docs/qa-faq.md.',
  },
};
