import { useEffect, useState } from 'react';

import { listDebtSnapshotsUseCase } from '@/application/debt/use_cases/listDebtSnapshotsUseCase';
import { type DebtSnapshot } from '@/domains/debt/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

const MONTHS_OF_HISTORY = 12;

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** The trailing 12 months including the current one, as `YYYY-MM` bounds. */
const trailingYearMonthRange = (now: Date): { start: string; end: string } => {
  const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS_OF_HISTORY - 1), 1);
  return { start: monthKey(start), end: monthKey(now) };
};

/**
 * Reads a loan's snapshot history through the use-case layer. Failures surface as
 * `errorMessage` (ADR-0072: 載入失敗是 UNKNOWN，不是空資料) so the detail page can
 * show an inline retry instead of an empty trend.
 */
export function useDebtSnapshots(householdId: string, debtAccountId: string, reloadNonce = 0) {
  const auth = useAuthIdentity();
  const [snapshots, setSnapshots] = useState<DebtSnapshot[]>([]);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  useEffect(() => {
    const controller = new AbortController();
    void run(
      async () => {
        if (!householdId || !debtAccountId) return [];
        const { start, end } = trailingYearMonthRange(new Date());
        return listDebtSnapshotsUseCase.execute({
          householdId,
          debtAccountId,
          startYearMonth: start,
          endYearMonth: end,
          auth,
        });
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (result.ok) setSnapshots(result.value);
        },
      },
    );
    return () => controller.abort();
  }, [householdId, debtAccountId, auth, run, reloadNonce]);

  return { snapshots, loading, errorMessage };
}
