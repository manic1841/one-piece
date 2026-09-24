import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface LedgerCodeItem {
  code: string;
  label: string;
  type: string;
  isCustom: boolean;
  isActive: boolean;
}

export const useLedgerCodes = (includeInactive = false) => {
  const { userProfile } = useAuthState();
  const auth = useAuthIdentity();
  const householdId = userProfile?.householdId;
  const [codes, setCodes] = useState<LedgerCodeItem[]>([]);
  const { loading, run } = useLoadingTask({ initiallyLoading: true });

  const fetchCodes = useCallback(async () => {
    // The no-household guard belongs inside the task: `initiallyLoading` is
    // released by *initiating* a run, so every path must initiate one.
    await run(
      async () =>
        householdId
          ? listAllLedgerCodesUseCase.execute({
              householdId,
              includeInactive,
              auth,
              labelResolver: getUnifiedLedgerCodeLabel,
            })
          : [],
      {
        writeBack: (result) => {
          if (result.ok) {
            setCodes(result.value);
          } else {
            console.error('Error fetching ledger codes:', result.error);
          }
        },
      },
    );
  }, [auth, householdId, includeInactive, run]);

  useEffect(() => {
    void fetchCodes();
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
