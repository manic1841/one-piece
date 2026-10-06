import React from 'react';

import { ShieldOff } from 'lucide-react';

import { GateSurface } from '@/ui/components/GateSurface';
import { Button } from '@/ui/components/ui/button';

/** 全站預設的拒絕存取說明；呼叫端可用 `description` 覆寫。 */
export const DEFAULT_ACCESS_DENIED_DESCRIPTION =
  'You do not have permission to access this application. Please contact the administrator to request access.';

interface AccessDeniedProps {
  /** 覆寫說明文字；預設為全站登入拒絕文案。 */
  description?: string;
  /** 登出並導回登入頁。由呼叫端注入，讓本元件留在 design-system 層而不持有 controller。 */
  onLogout: () => void;
}

/**
 * 拒絕存取畫面。兩個消費端跨 feature（`/access-denied` 路由與 Settings 授權閘），
 * 依 `ui-layer-architecture.md` §2 規則 8／9 住在共用元件層。
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  description = DEFAULT_ACCESS_DENIED_DESCRIPTION,
  onLogout,
}) => (
  <GateSurface className="space-y-6 text-center">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/15 rounded-full">
      <ShieldOff size={40} className="text-destructive" aria-hidden="true" />
    </div>

    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>

      <p className="text-muted-foreground">{description}</p>
    </div>

    <Button onClick={onLogout} variant="outline" className="w-full">
      Logout
    </Button>
  </GateSurface>
);
