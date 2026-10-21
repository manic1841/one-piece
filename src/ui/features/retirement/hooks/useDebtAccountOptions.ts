import { useState } from 'react';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { useLoadOnce } from '@/ui/features/retirement/hooks/useLoadOnce';

export interface DebtAccountOption {
  id: string;
  name: string;
}

/** Debt account options for the rule source picker; closed accounts stay listed. */
export function useDebtAccountOptions(householdId: string | undefined) {
  const [accounts, setAccounts] = useState<DebtAccountOption[]>([]);

  const { loading } = useLoadOnce(
    async () => {
      if (!householdId) return [];
      const rows = await listDebtAccountsUseCase.execute({ householdId, includeInactive: true });
      return rows.map((row) => ({ id: row.id, name: row.name }));
    },
    setAccounts,
    [householdId],
    { initiallyLoading: true },
  );

  return { accounts, loading };
}
