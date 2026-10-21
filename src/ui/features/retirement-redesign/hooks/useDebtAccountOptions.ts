import { useCallback, useEffect, useState } from 'react';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface DebtAccountOption {
  id: string;
  name: string;
}

/** Debt account options for the rule source picker; closed accounts stay listed. */
export function useDebtAccountOptions(householdId: string | undefined) {
  const [accounts, setAccounts] = useState<DebtAccountOption[]>([]);
  const { loading, run } = useLoadingTask({ initiallyLoading: true });

  const load = useCallback(async () => {
    await run(
      async () => {
        if (!householdId) return [];
        const rows = await listDebtAccountsUseCase.execute({
          householdId,
          includeInactive: true,
        });
        return rows.map((row) => ({ id: row.id, name: row.name }));
      },
      {
        writeBack: (result) => {
          if (result.ok) setAccounts(result.value);
        },
      },
    );
  }, [householdId, run]);

  useEffect(() => {
    void load();
  }, [load]);

  return { accounts, loading };
}
