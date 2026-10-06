import React from 'react';

import { NavLink, Outlet } from 'react-router-dom';

import { AccessDenied } from '@/ui/components/AccessDenied';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import {
  tabListBaseClass,
  tabTriggerBaseClass,
  tabTriggerSelectedClass,
} from '@/ui/components/ui/tabs-styles';
import {
  SETTINGS_SECTION_PATHS,
  SettingsSectionLabels,
  SettingsShellLabels,
} from '@/ui/constants/setting/settingsLabels';
import {
  useSettingsShell,
  visibleSettingsSections,
} from '@/ui/features/setting/hooks/useSettingsShell';
import { useLogoutRedirect } from '@/ui/hooks/useLogoutRedirect';
import { cn } from '@/ui/utils/cn';

const settingsTabClass = cn(tabTriggerBaseClass, tabTriggerSelectedClass);

/**
 * Settings 的共用外殼：一次授權閘 + 路由式頁籤列 + 子區段 `Outlet`。
 *
 * 角色過濾後只渲染有權限的頁籤；`Outlet` 以 context 傳出存取結果，子區段據此
 * 自行做角色閘，不需重複解析 household 角色。
 */
const SettingsLayout: React.FC = () => {
  const { isAdmin, isHouseholdOwnerOrAdmin, isSettingsAuthorized, loading } = useSettingsShell();
  const onLogout = useLogoutRedirect();

  if (loading) {
    return (
      <div role="status" className="space-y-2 py-2">
        <span className="sr-only">{SettingsShellLabels.loading}</span>
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </div>
    );
  }

  if (!isSettingsAuthorized) {
    return (
      <AccessDenied
        description={SettingsShellLabels.accessDeniedDescription}
        onLogout={() => void onLogout()}
      />
    );
  }

  const access = { isAdmin, isHouseholdOwnerOrAdmin };

  return (
    <div className="space-y-6">
      <PageHeader title={SettingsShellLabels.title} description={SettingsShellLabels.description} />

      <div className="overflow-x-auto">
        <nav aria-label={SettingsShellLabels.tabsAriaLabel}>
          <div className={cn(tabListBaseClass, 'min-w-max')}>
            {visibleSettingsSections(access).map((section) => (
              <NavLink
                key={section}
                to={SETTINGS_SECTION_PATHS[section]}
                className={settingsTabClass}
              >
                {SettingsSectionLabels[section]}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <Outlet context={access} />
    </div>
  );
};

export default SettingsLayout;
