import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { useAuth } from '@/infra/contexts/useAuth';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export interface LedgerCodeItem {
  code: string;
  label: string;
  type: string;
  isCustom: boolean;
  isActive: boolean;
}

export const useLedgerCodes = (includeInactive = false) => {
  const { userProfile } = useAuth();
  const auth = useAuthContext();
  const householdId = userProfile?.householdId;
  const [codes, setCodes] = useState<LedgerCodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const entries = await listAllLedgerCodesUseCase.execute({
        householdId,
        includeInactive,
        auth,
        labelResolver: getUnifiedLedgerCodeLabel,
      });
      setCodes(entries);
    } catch (error) {
      console.error('Error fetching ledger codes:', error);
    } finally {
      setLoading(false);
    }
  }, [auth, householdId, includeInactive]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const getLabel = useCallback(
    (code: string) => {
      const item = codes.find((c) => c.code === code);
      if (item) return item.label;
      return getUnifiedLedgerCodeLabel(code);
    },
    [codes],
  );

  return {
    codes,
    loading,
    refresh: fetchCodes,
    getLabel,
  };
};
