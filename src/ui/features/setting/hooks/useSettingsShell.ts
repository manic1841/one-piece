import { useEffect, useState } from 'react';

import { getHouseholdUseCase } from '@/application/household/use_cases/getHouseholdUseCase';
import { RoleEnum } from '@/domains/household/role';
import {
  SETTINGS_SECTION_ORDER,
  type SettingsSectionKey,
} from '@/ui/constants/setting/settingsLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';

/** Settings 各區段共享的存取結果；經 `Outlet` context 傳給子路由。 */
export interface SettingsAccessContext {
  isAdmin: boolean;
  isHouseholdOwnerOrAdmin: boolean;
}

/**
 * 依角色過濾可見區段，維持 `SETTINGS_SECTION_ORDER` 的顯示順序。
 *
 * `system` 只對全域管理員開放；其餘三區段需 household owner/admin。
 */
export const visibleSettingsSections = (access: SettingsAccessContext): SettingsSectionKey[] =>
  SETTINGS_SECTION_ORDER.filter((key) =>
    key === 'system' ? access.isAdmin : access.isHouseholdOwnerOrAdmin,
  );

/**
 * 導向目標：第一個有權限的區段。呼叫端須先確認使用者通過 `isSettingsAuthorized`；
 * 未通過時仍回傳 `household`，由呼叫端的授權閘攔下而不會導向無權頁面。
 */
export const firstVisibleSettingsSection = (access: SettingsAccessContext): SettingsSectionKey =>
  visibleSettingsSections(access)[0] ?? 'household';

interface UseSettingsShellResult extends SettingsAccessContext {
  isSettingsAuthorized: boolean;
  loading: boolean;
}

/**
 * Settings 外殼的控制器：解析 household 角色並推導授權結果。
 *
 * 只讀取 household 文檔的角色欄位；成員清單等區段專屬資料由各區段頁面自己的
 * hook 取得，避免切換頁籤時載入他人資料。
 */
export function useSettingsShell(): UseSettingsShellResult {
  const { user, userProfile, isAdmin } = useAuthState();
  const householdId = userProfile?.householdId;

  const [householdRole, setHouseholdRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user || !householdId) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getHouseholdUseCase.execute({ householdId });
        if (!cancelled) setHouseholdRole(data?.members[user.uid]?.role ?? null);
      } catch (err) {
        console.error('Error fetching household role:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, householdId]);

  const isHouseholdOwnerOrAdmin =
    householdRole === RoleEnum.OWNER || householdRole === RoleEnum.ADMIN;

  return {
    isAdmin,
    isHouseholdOwnerOrAdmin,
    isSettingsAuthorized: isAdmin || isHouseholdOwnerOrAdmin,
    loading,
  };
}
