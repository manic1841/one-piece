import React from 'react';

import { AccessDenied } from '@/ui/components/AccessDenied';
import { useLogoutRedirect } from '@/ui/hooks/useLogoutRedirect';

/**
 * `/access-denied` 路由的著陸頁：接上登出控制器，版面由共用的 `AccessDenied`
 * 提供。Settings 授權閘走同一個共用元件，只是換上自己的說明文字。
 */
const AccessDeniedPage: React.FC = () => {
  const onLogout = useLogoutRedirect();

  return <AccessDenied onLogout={() => void onLogout()} />;
};

export default AccessDeniedPage;
