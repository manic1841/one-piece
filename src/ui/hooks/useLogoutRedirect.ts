import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuthState } from '@/ui/contexts/useAuthState';

/**
 * 登出後導回登入頁——拒絕存取畫面的共同離開路徑。
 *
 * 兩個消費端（`/access-denied` 路由與 Settings 授權閘）需要同一段接線，抽在這裡
 * 避免共用的 `AccessDenied` 為了拿 controller 而被拉進 context 依賴。
 */
export const useLogoutRedirect = (): (() => Promise<void>) => {
  const { logout } = useAuthState();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);
};
