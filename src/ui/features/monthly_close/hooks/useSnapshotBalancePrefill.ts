import { useEffect, useState } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';

interface UseSnapshotBalancePrefillArgs {
  householdId: string;
  selectedYearMonth: string;
  accounts: Account[];
  auth: AuthContext;
  setAccountBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
}

/**
 * Loads each account's current and previous month snapshots for the selected
 * close month, exposes the previous snapshots for display, and prefills ending
 * balances from the month's own snapshots (re-entering a started close or
 * viewing a seeded period). Only fills accounts the user has not typed into;
 * never overwrites in-progress input.
 */
export const useSnapshotBalancePrefill = ({
  householdId,
  selectedYearMonth,
  accounts,
  auth,
  setAccountBalances,
}: UseSnapshotBalancePrefillArgs) => {
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
      setAccountBalances((current) => {
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
  }, [accounts, auth, householdId, selectedYearMonth, setAccountBalances]);

  return accountSnapshots;
};
