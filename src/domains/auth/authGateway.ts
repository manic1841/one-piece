import { type AuthUser } from './identity';
import { type AuthInitErrorCode } from './authInitError';

/**
 * infra 觀測到的一次認證狀態。**這是 infra 的產出，不是 UI 的狀態**：
 * 登入狀態無法由 domain 推導，只能由 infra 觀測後放上來（issue #177 定案 Q11/Q12）。
 */
export interface AuthGatewaySnapshot {
  /** null 表示未登入。 */
  user: AuthUser | null;
  /** 全域管理者旗標，來自 token claim。 */
  isAdmin: boolean;
  /** 非 null 表示初始化失敗（後端不可達等）。 */
  initError: AuthInitErrorCode | null;
  /**
   * 建立 `UserProfile` 記錄時要用的起始顯示值，由身分提供者提供。
   *
   * 只在 profile **不存在而需要建立**時使用；profile 本身是這些事實的唯一來源，
   * 因此不放在 `AuthUser` 上（見 identity.ts）。fallback 政策屬 application，
   * 不在此決定。
   */
  profileSeed: { displayName: string; photoURL?: string };
}

/**
 * 認證閘道：UI 唯一能取得的認證能力，也是 infra 唯一實作認證的地方。
 *
 * 這是「依賴反轉」的介面——`App.tsx`（composition root）把 infra 實作注入 UI provider，
 * 因此 `src/ui/**` 對 `@/infra` 的 import 可以是零（issue #177 定案 Q1/Q17）。
 */
export interface AuthGateway {
  /**
   * 訂閱認證狀態。回傳取消訂閱函式。
   *
   * 實作必須在**無法初始化**時也發出一次快照（帶 `initError`），而不是永不回呼。
   */
  subscribe(onSnapshot: (snapshot: AuthGatewaySnapshot) => void): () => void;
  loginWithGoogle(): Promise<void>;
  logout(): Promise<void>;
  /** 讀取管理者 claim；`forceRefresh` 為 true 時強制向後端重取。 */
  getIsAdmin(forceRefresh: boolean): Promise<boolean>;
}
