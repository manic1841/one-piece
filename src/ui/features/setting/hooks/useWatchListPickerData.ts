import { useCallback, useEffect, useState } from 'react';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listCustomLedgerCodesUseCase } from '@/application/ledger/use_cases/listCustomLedgerCodesUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { type Project } from '@/domains/project/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface WatchListPickerData {
  projects: Project[];
  ledgerCodes: { code: string; label: string }[];
  debtAccounts: DebtAccount[];
}

export function useWatchListPickerData(): WatchListPickerData {
  const { userProfile } = useAuth();
  const auth = useAuthContext();
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
      const [projects, debtAccounts, customCodes] = await Promise.all([
        listProjectsUseCase.execute({ householdId }),
        listDebtAccountsUseCase.execute({ householdId, includeInactive: false }),
        listCustomLedgerCodesUseCase.execute({ householdId, auth }),
      ]);

      const systemCodes = Object.values(LEDGER_CODES).map((code) => ({
        code,
        label: getUnifiedLedgerCodeLabel(code),
      }));
      const customItems = customCodes.map((custom) => ({
        code: custom.code,
        label: custom.label,
      }));

      setPickerData({
        projects,
        debtAccounts,
        ledgerCodes: [...systemCodes, ...customItems],
      });
    });
  }, [auth, householdId, run]);

  useEffect(() => {
    fetchPickerData();
  }, [fetchPickerData]);

  return pickerData;
}
