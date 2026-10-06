import React from 'react';

import { Navigate } from 'react-router-dom';

import { SETTINGS_SECTION_PATHS } from '@/ui/constants/setting/settingsLabels';
import {
  type SettingsAccessContext,
  firstVisibleSettingsSection,
} from '@/ui/features/setting/hooks/useSettingsShell';

interface SettingsSectionGateProps {
  access: SettingsAccessContext;
  /** 此區段是否對目前角色開放。 */
  authorized: boolean;
  children: React.ReactNode;
}

/**
 * 單一 Settings 區段的角色閘。無權限時改導向該使用者第一個有權限的區段，
 * 避免停在空白畫面。
 */
export const SettingsSectionGate: React.FC<SettingsSectionGateProps> = ({
  access,
  authorized,
  children,
}) => {
  if (!authorized) {
    return <Navigate to={SETTINGS_SECTION_PATHS[firstVisibleSettingsSection(access)]} replace />;
  }
  return <>{children}</>;
};
