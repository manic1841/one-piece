import React from 'react';

import { Navigate, useOutletContext } from 'react-router-dom';

import {
  type SettingsAccessContext,
  firstVisibleSettingsPath,
} from '@/ui/features/setting/hooks/useSettingsShell';

/** `/settings` 的落地頁：導向目前角色第一個有權限的區段。 */
const SettingsIndexRedirect: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return <Navigate to={firstVisibleSettingsPath(access)} replace />;
};

export default SettingsIndexRedirect;
