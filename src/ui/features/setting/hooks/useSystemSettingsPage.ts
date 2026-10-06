import { useCallback, useEffect, useState } from 'react';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useWhitelist } from '@/ui/features/setting/hooks/useWhitelist';

/**
 * System 區段的控制器：全域管理員的 email 白名單。非管理員不會發送讀取。
 */
export function useSystemSettingsPage() {
  const { isAdmin } = useAuthState();
  const {
    fetchWhitelist,
    addEmail,
    removeEmail,
    loading: whitelistLoading,
    error: whitelistError,
  } = useWhitelist();

  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const refreshWhitelist = useCallback(async () => {
    if (!isAdmin) return;
    setWhitelist(await fetchWhitelist());
  }, [isAdmin, fetchWhitelist]);

  useEffect(() => {
    void refreshWhitelist();
  }, [refreshWhitelist]);

  const addWhitelistEmail = async (email: string) => {
    setSaving(true);
    try {
      await addEmail(email);
      await refreshWhitelist();
    } finally {
      setSaving(false);
    }
  };

  const removeWhitelistEmail = async (email: string) => {
    setSaving(true);
    try {
      await removeEmail(email);
      await refreshWhitelist();
    } finally {
      setSaving(false);
    }
  };

  return {
    whitelist,
    loading: whitelistLoading,
    saving,
    error: whitelistError || '',
    addWhitelistEmail,
    removeWhitelistEmail,
  };
}
