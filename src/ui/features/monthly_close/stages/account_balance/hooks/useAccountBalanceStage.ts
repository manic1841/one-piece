import { useEffect, useState } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';

interface UseAccountBalanceStageArgs {
  householdId: string;
  selectedYearMonth: string;
  accounts: Account[];
  auth: AuthContext;
  confirmingStageId: string | null;
  /** Bumped after a relevant confirm so the snapshot prefill re-runs. */
  refreshKey?: number;
}

/**
 * Stage controller for ACCOUNT_BALANCE: owns the ending-balance draft and the
 * snapshot prefill that seeds it (absorbed from useSnapshotBalancePrefill).
 * Exposes the previous snapshots for display; prefill only fills accounts the
 * user has not typed into and never overwrites in-progress input.
 */
export const useAccountBalanceStage = ({
  householdId,
  selectedYearMonth,
  accounts,
  auth,
  confirmingStageId,
  refreshKey = 0,
}: UseAccountBalanceStageArgs): CloseStageControl & {
  balances: AccountBalanceInput[];
  setBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
  accountSnapshots: Map<string, AccountSnapshot>;
} => {
  const [balances, setBalances] = useState<AccountBalanceInput[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<Map<string, AccountSnapshot>>(new Map());

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const loadAccountSnapshots = async () => {
      const year = Number(selectedYearMonth.slice(0, 4));
      const month = Number(selectedYearMonth.slice(5, 7));
      const entries = await Promise.all(
        accounts.map(async (account) => {
          const [currentSnapshot, previousSnapshot] = await Promise.all([
            getAccountSnapshotsUseCase.execute({
              householdId,
              accountId: account.id,
              year,
              month,
              auth,
            }),
            getPreviousSnapshotUseCase.execute({
              householdId,
              accountId: account.id,
              year,
              month,
              auth,
            }),
          ]);
          return [account.id, currentSnapshot[0] ?? null, previousSnapshot] as const;
        }),
      );
      if (cancelled) return;
      const previousMap = new Map<string, AccountSnapshot>();
      for (const [accountId, , previousSnapshot] of entries) {
        if (previousSnapshot) previousMap.set(accountId, previousSnapshot);
      }
      setAccountSnapshots(previousMap);
      setBalances((current) => {
        if (current.length > 0) return current;
        const prefilled: AccountBalanceInput[] = [];
        for (const [accountId, currentSnapshot] of entries) {
          if (!currentSnapshot) continue;
          prefilled.push({
            accountId,
            amount: currentSnapshot.amount,
            ...(currentSnapshot.originalAmount !== undefined
              ? { originalAmount: currentSnapshot.originalAmount }
              : {}),
            ...(currentSnapshot.exchangeRate !== undefined
              ? { exchangeRate: currentSnapshot.exchangeRate }
              : {}),
            ...(currentSnapshot.holdings !== undefined
              ? { holdings: currentSnapshot.holdings }
              : {}),
          });
        }
        return prefilled;
      });
    };

    void loadAccountSnapshots();
    return () => {
      cancelled = true;
    };
  }, [accounts, auth, householdId, selectedYearMonth, refreshKey]);

  const control = useConfirmStageControl({
    stageId: 'ACCOUNT_BALANCE',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'ACCOUNT_BALANCE', accountBalances: balances }),
    resetDraft: () => setBalances([]),
  });

  return { ...control, balances, setBalances, accountSnapshots };
};
