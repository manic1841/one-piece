import React from 'react';

import { Navigate, useOutletContext } from 'react-router-dom';

import { SETTINGS_SECTION_PATHS } from '@/ui/constants/setting/settingsLabels';
import {
  type SettingsAccessContext,
  firstVisibleSettingsSection,
} from '@/ui/features/setting/hooks/useSettingsShell';

/** `/settings` 的落地頁：導向目前角色第一個有權限的區段。 */
const SettingsIndexRedirect: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return <Navigate to={SETTINGS_SECTION_PATHS[firstVisibleSettingsSection(access)]} replace />;
};

export default SettingsIndexRedirect;
