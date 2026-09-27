import { type UserProfile, type UserProfileCreate } from '@/domains/auth/user/types';

import { createUserProfileUseCase } from './createUserProfileUseCase';
import { getUserProfileUseCase } from './getUserProfileUseCase';

export interface EnsureUserProfileRequest {
  uid: string;
  email: string;
  /** 身分提供者給的顯示名稱；空字串表示沒有。 */
  displayName: string;
  photoURL?: string;
}

/**
 * 顯示名稱的 fallback 政策：優先用身分提供者的名稱，其次 email 的 @ 前段，最後 Anonymous。
 *
 * 這是 application 的**決策**，infra 只負責把觀測到的值放上來（issue #177 定案 Q12）。
 */
export const deriveDisplayName = (displayName: string, email: string): string => {
  if (displayName.trim() !== '') return displayName;
  if (email) return email.split('@')[0];
  return 'Anonymous';
};

/**
 * 確保使用者有 profile 記錄：不存在則以身分提供者的資料建立，再回讀。
 *
 * 這段「查詢 → 判斷 → 建立 → 重查」原本內嵌在 `AuthProvider`（infra）內，
 * 但它是不涉及 Firebase 的 application 編排，因此依 issue #177 定案 Q26 收束成 use case。
 *
 * 失敗（例如 email 為空導致 schema 驗證不過）會向上拋，由呼叫端的 Controller 決定如何呈現。
 */
export class EnsureUserProfileUseCase {
  async execute(request: EnsureUserProfileRequest): Promise<UserProfile | null> {
    const { uid, email, displayName, photoURL } = request;

    const existing = await getUserProfileUseCase.execute({ uid });
    if (existing) return existing;

    const profile: UserProfileCreate = {
      uid,
      email,
      displayName: deriveDisplayName(displayName, email),
      photoURL: photoURL || undefined,
    };

    await createUserProfileUseCase.execute({ profile });
    return await getUserProfileUseCase.execute({ uid });
  }
}

export const ensureUserProfileUseCase = new EnsureUserProfileUseCase();
