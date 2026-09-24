import { useEffect, useState } from 'react';

import { listDebtSnapshotsUseCase } from '@/application/debt/use_cases/listDebtSnapshotsUseCase';
import { type DebtSnapshot } from '@/domains/debt/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

const MONTHS_OF_HISTORY = 12;

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** The trailing 12 months including the current one, as `YYYY-MM` bounds. */
const trailingYearMonthRange = (now: Date): { start: string; end: string } => {
  const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS_OF_HISTORY - 1), 1);
  return { start: monthKey(start), end: monthKey(now) };
};

/** Reads a loan's snapshot history through the use-case layer. */
export function useDebtSnapshots(householdId: string, debtAccountId: string) {
  const auth = useAuthIdentity();
  const [snapshots, setSnapshots] = useState<DebtSnapshot[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!householdId || !debtAccountId || !auth) return;
      const { start, end } = trailingYearMonthRange(new Date());
      const data = await listDebtSnapshotsUseCase.execute({
        householdId,
        debtAccountId,
        startYearMonth: start,
        endYearMonth: end,
        auth,
      });
      if (!ignore) setSnapshots(data);
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [householdId, debtAccountId, auth]);

  return { snapshots };
}
