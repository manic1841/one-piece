/**
 * 啟動期不可回復失敗的錯誤碼。infra 只給碼，顯示文字由 UI 決定
 * （見 docs/ui/ui-layer-architecture.md §5.1）。
 *
 * 單一宣告：infra 與 UI 都由此 import，不另外鏡射一份同構 union
 * （issue #177 定案 Q10）。
 */
export const AUTH_INIT_ERROR_CODES = ['auth-backend-unreachable'] as const;

export type AuthInitErrorCode = (typeof AUTH_INIT_ERROR_CODES)[number];

/**
 * 認證初始化失敗時可回復的預設立即原因。
 *
 * `onAuthStateChanged` 在後端不可達時永遠不會回呼，若只依賴它便會無限等待，
 * 因此超過時限仍未取得第一次回呼即視為此失敗。時限的數值屬 infra 的觀測政策。
 */
export const AUTH_BACKEND_UNREACHABLE: AuthInitErrorCode = 'auth-backend-unreachable';
