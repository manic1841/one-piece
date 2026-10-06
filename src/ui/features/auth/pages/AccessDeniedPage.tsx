import React from 'react';

import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GateSurface } from '@/ui/components/GateSurface';
import { Button } from '@/ui/components/ui/button';
import { useAuthState } from '@/ui/contexts/useAuthState';

interface AccessDeniedProps {
  /** 覆寫說明文字；預設為全站登入拒絕文案。 */
  description?: string;
}

const DEFAULT_DESCRIPTION =
  'You do not have permission to access this application. Please contact the administrator to request access.';

const AccessDenied: React.FC<AccessDeniedProps> = ({ description = DEFAULT_DESCRIPTION }) => {
  const { logout } = useAuthState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <GateSurface className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/15 rounded-full">
        <ShieldOff size={40} className="text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>

        <p className="text-muted-foreground">{description}</p>
      </div>

      <Button onClick={handleLogout} variant="outline" className="w-full">
        Logout
      </Button>
    </GateSurface>
  );
};

export default AccessDenied;
