import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

const LOAD_ERROR = '無法載入帳戶快照，請稍後再試。';

interface UseAccountBalanceStageArgs {
  householdId: string;
  selectedYearMonth: string;
  accounts: Account[];
  auth: AuthContext;
  confirmingStageId: string | null;
}

interface AccountSnapshotData {
  /** The previous month's snapshot per account, for the read-only prior column. */
  previousSnapshots: Map<string, AccountSnapshot>;
  /** The current month's booked balance per account, for prefill. */
  prefill: AccountBalanceInput[];
}

/**
 * Loads the month's account snapshots (current + previous per account). A read
 * failure throws the canned message so the surface shows copy the consumer
 * owns instead of the empty tables a silent failure would leave behind.
 */
const fetchAccountSnapshots = async ({
  householdId,
  selectedYearMonth,
  accounts,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  accounts: Account[];
  auth: AuthContext;
}): Promise<AccountSnapshotData> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
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
    const previousSnapshots = new Map<string, AccountSnapshot>();
    for (const [accountId, , previousSnapshot] of entries) {
      if (previousSnapshot) previousSnapshots.set(accountId, previousSnapshot);
    }
    const prefill: AccountBalanceInput[] = [];
    for (const [accountId, currentSnapshot] of entries) {
      if (!currentSnapshot) continue;
      prefill.push({
        accountId,
        amount: currentSnapshot.amount,
        ...(currentSnapshot.originalAmount !== undefined
          ? { originalAmount: currentSnapshot.originalAmount }
          : {}),
        ...(currentSnapshot.exchangeRate !== undefined
          ? { exchangeRate: currentSnapshot.exchangeRate }
          : {}),
        ...(currentSnapshot.holdings !== undefined ? { holdings: currentSnapshot.holdings } : {}),
      });
    }
    return { previousSnapshots, prefill };
  } catch (caught) {
    logger.warn('Failed to load account snapshots', 'useAccountBalanceStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/**
 * Stage controller for ACCOUNT_BALANCE: owns the ending-balance draft and the
 * snapshot prefill that seeds it (absorbed from useSnapshotBalancePrefill).
 * Exposes the previous snapshots for display; prefill only fills accounts the
 * user has not typed into and never overwrites in-progress input. A load
 * failure surfaces the canned message without blocking confirm: prefill is a
 * convenience, so a draft the user typed by hand still submits.
 */
export const useAccountBalanceStage = ({
  householdId,
  selectedYearMonth,
  accounts,
  auth,
  confirmingStageId,
}: UseAccountBalanceStageArgs): CloseStageControl & {
  balances: AccountBalanceInput[];
  setBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
  accountSnapshots: Map<string, AccountSnapshot>;
  errorMessage: string | null;
} => {
  const [balances, setBalances] = useState<AccountBalanceInput[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<Map<string, AccountSnapshot>>(new Map());
  const { errorMessage, run } = useLoadingTask();
  // A slow load for a month the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchAccountSnapshots({ householdId, selectedYearMonth, accounts, auth }), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setAccountSnapshots(result.value.previousSnapshots);
        setBalances((current) => {
          if (current.length > 0) return current;
          return result.value.prefill;
        });
      },
    });
  }, [accounts, auth, householdId, run, selectedYearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const control = useConfirmStageControl({
    stageId: 'ACCOUNT_BALANCE',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'ACCOUNT_BALANCE', accountBalances: balances }),
    resetDraft: () => setBalances([]),
    refresh: load,
  });

  return { ...control, balances, setBalances, accountSnapshots, errorMessage };
};
