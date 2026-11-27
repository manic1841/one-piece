import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { measure } from '@/shared/perf';

/**
 * 讀取型 use case 的共同前門：家庭權限檢查與資料讀取互不相依，所以並行而非
 * 排隊。序列版本讓每次進頁面固定多一趟往返才開始抓資料（規則本來也會擋，
 * 這裡的檢查只是為了先拿到可讀的錯誤訊息）。
 *
 * 錯誤以權限失敗優先：未授權時規則也會讓查詢失敗，真正的原因通常是「你不是
 * 這個家庭的成員」，不該被 Firestore 的 permission-denied 蓋掉。
 *
 * `skipPermissionCheck` 供批次取多筆資料的呼叫端使用：外層已經驗過同一份
 * household，內層的每一筆就不必重複驗。
 */
export async function withReadPermission<T>(
  householdId: string,
  auth: AuthContext,
  run: () => Promise<T>,
  options: { skipPermissionCheck?: boolean } = {},
): Promise<T> {
  if (options.skipPermissionCheck) return run();

  const permission = measure('permission check', () =>
    householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin),
  ).then(
    () => null,
    (error: unknown) => error,
  );

  let result: T;
  try {
    result = await run();
  } catch (error) {
    throw (await permission) ?? error;
  }

  const denied = await permission;
  if (denied !== null) throw denied;
  return result;
}
