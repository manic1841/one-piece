import { useCallback } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useSeededDraft } from '@/ui/features/monthly_close/hooks/useSeededDraft';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

const LOAD_ERROR = '無法載入帳戶快照，請稍後再試。';

interface UseAccountBalanceStageArgs {
  householdId: string;
  selectedYearMonth: string;
  accounts: Account[];
  confirmingStageId: string | null;
  enabled?: boolean;
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
 * Stage controller for ACCOUNT_BALANCE: the ending-balance draft and the snapshot prefill that
 * seeds it. The draft is seeded by `useSeededDraft`, so a same-month reload never overwrites an
 * edit; the gate waits for the shared accounts so an empty list cannot lock the month (#232).
 */
export const useAccountBalanceStage = ({
  householdId,
  selectedYearMonth,
  accounts,
  confirmingStageId,
  enabled = true,
}: UseAccountBalanceStageArgs): CloseStageControl<'ACCOUNT_BALANCE'> & {
  balances: AccountBalanceInput[] | null;
  setBalances: (value: AccountBalanceInput[]) => void;
  accountSnapshots: Map<string, AccountSnapshot>;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchAccountSnapshots({ householdId, selectedYearMonth, accounts, auth }),
    [accounts, auth, householdId, selectedYearMonth],
  );
  // The gate waits for the shared accounts: an empty list seeds the month from nothing.
  const { data, errorMessage, refresh } = useStageLoader<AccountSnapshotData>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '' && accounts.length > 0,
    load,
  });
  const [balances, setBalances] = useSeededDraft<AccountBalanceInput[]>(
    selectedYearMonth,
    data?.prefill ?? null,
  );

  const control = useConfirmStageControl({
    stageId: 'ACCOUNT_BALANCE',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'ACCOUNT_BALANCE', accountBalances: balances ?? [] }),
    refresh,
  });

  return {
    ...control,
    balances,
    setBalances,
    accountSnapshots: data?.previousSnapshots ?? new Map<string, AccountSnapshot>(),
    errorMessage,
  };
};
