import { useCallback, useEffect, useState } from 'react';

import { listCustomLedgerCodesUseCase } from '@/application/ledger/use_cases/listCustomLedgerCodesUseCase';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { useAuth } from '@/infra/contexts/useAuth';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';

export interface LedgerCodeItem {
  code: string;
  label: string;
  type: string;
  isCustom: boolean;
  isActive: boolean;
}

export const useLedgerCodes = (includeInactive = false) => {
  const { userProfile, currentUser, isAdmin } = useAuth();
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
      // 1. Get System Defaults
      const systemCodes: LedgerCodeItem[] = Object.values(LEDGER_CODES).map((code) => ({
        code,
        label: getUnifiedLedgerCodeLabel(code),
        type: code.split(':')[0],
        isCustom: false,
        isActive: true,
      }));

      // 2. Get Custom Codes through the application layer
      const customCodes = await listCustomLedgerCodesUseCase.execute({
        householdId,
        includeInactive,
        auth: {
          uid: currentUser?.uid ?? '',
          email: currentUser?.email ?? '',
          isGlobalAdmin: isAdmin,
        },
      });
      const customItems: LedgerCodeItem[] = customCodes.map((c) => ({
        code: c.code,
        label: c.label,
        type: c.type,
        isCustom: true,
        isActive: c.isActive,
      }));

      // Merge: System codes first, then custom ones
      setCodes([...systemCodes, ...customItems]);
    } catch (error) {
      console.error('Error fetching ledger codes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, householdId, includeInactive, isAdmin]);

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
