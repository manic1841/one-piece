import { useCallback } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useSourceOptions } from '@/ui/hooks/useSourceOptions';

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

  // The no-household guard belongs inside the task: `initiallyLoading` is
  // released by *initiating* a run, so every path must initiate one.
  const source = useSourceOptions<LedgerCodeItem>(
    async () =>
      householdId
        ? listAllLedgerCodesUseCase.execute({
            householdId,
            includeInactive,
            auth,
            labelResolver: getUnifiedLedgerCodeLabel,
          })
        : [],
    [auth, householdId, includeInactive],
  );

  const getLabel = useCallback(
    (code: string) => {
      const item = source.items.find((c) => c.code === code);
      if (item) return item.label;
      return getUnifiedLedgerCodeLabel(code);
    },
    [source.items],
  );

  return { ...source, getLabel };
};
