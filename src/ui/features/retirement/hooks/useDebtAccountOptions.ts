import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { useSourceOptions } from '@/ui/hooks/useSourceOptions';

export interface DebtAccountOption {
  id: string;
  name: string;
}

/** Debt account options for the rule source picker; closed accounts stay listed. */
export function useDebtAccountOptions(householdId: string | undefined) {
  return useSourceOptions<DebtAccountOption>(async () => {
    if (!householdId) return [];
    const rows = await listDebtAccountsUseCase.execute({ householdId, includeInactive: true });
    return rows.map((row) => ({ id: row.id, name: row.name }));
  }, [householdId]);
}
