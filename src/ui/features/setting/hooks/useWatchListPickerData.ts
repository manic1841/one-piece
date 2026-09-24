import { useCallback, useEffect, useState } from 'react';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Project } from '@/domains/project/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface WatchListPickerData {
  projects: Project[];
  ledgerCodes: { code: string; label: string }[];
  debtAccounts: DebtAccount[];
}

export function useWatchListPickerData(): WatchListPickerData {
  const { userProfile } = useAuthState();
  const auth = useAuthIdentity();
  const householdId = userProfile?.householdId;
  const [pickerData, setPickerData] = useState<WatchListPickerData>({
    projects: [],
    ledgerCodes: [],
    debtAccounts: [],
  });
  const { run } = useLoadingTask();

  const fetchPickerData = useCallback(async () => {
    if (!householdId) return;
    await run(async () => {
      const [projects, debtAccounts, ledgerCodeEntries] = await Promise.all([
        listProjectsUseCase.execute({ householdId }),
        listDebtAccountsUseCase.execute({ householdId, includeInactive: false }),
        listAllLedgerCodesUseCase.execute({
          householdId,
          auth,
          labelResolver: getUnifiedLedgerCodeLabel,
        }),
      ]);

      setPickerData({
        projects,
        debtAccounts,
        ledgerCodes: ledgerCodeEntries.map((entry) => ({ code: entry.code, label: entry.label })),
      });
    });
  }, [auth, householdId, run]);

  useEffect(() => {
    fetchPickerData();
  }, [fetchPickerData]);

  return pickerData;
}
