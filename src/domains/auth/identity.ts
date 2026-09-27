/**
 * UI 可見的登入身分投影。
 *
 * 這是 infra 與 UI 之間的跨層契約：infra 由 SDK 觀測值映射出它，UI 只認識這個形狀，
 * 因此 UI 完全不必知道 Firebase 型別（issue #177）。
 *
 * 刻意**不保留 null**：SDK 的 `string | null` 由 infra 的映射消化掉（缺席即空字串）。
 * 也刻意不含 `displayName` / `photoURL`——那兩個事實屬於 `UserProfile`，同一個事實
 * 不設第二個來源（見 CONTEXT.md 的人／身分／profile 區分）。
 */
export interface AuthUser {
  uid: string;
  email: string;
}
