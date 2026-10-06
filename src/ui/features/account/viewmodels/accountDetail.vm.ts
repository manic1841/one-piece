import { type AccountSnapshot, type Holding } from '@/domains/account/types/account';
import { type MoneyChangeTone } from '@/ui/components/moneyTone';
import { ACCOUNT_VALUE_MISSING } from '@/ui/constants/account/pageLabels';
import { type HoldingRowVM, toHoldingRowVM } from '@/ui/features/account/viewmodels/account.vm';
import { formatCurrency, formatMonthLabel } from '@/ui/utils';

export type { AccountSnapshot };

export interface AccountHistoryRowVM {
  id: string;
  periodLabel: string;
  balance: number;
  balanceText: string;
  /** Signed change against the previous period; `—` for the oldest period. */
  changeText: string;
  changeTone: MoneyChangeTone;
  holdingsCount: number;
  holdings: HoldingRowVM[];
}

const toHoldings = (holdings: readonly Holding[] | undefined): HoldingRowVM[] =>
  (holdings ?? []).map((holding, index) => toHoldingRowVM(holding, index));

/** Signed money for a change line, e.g. `+NT$12,000` / `-NT$400`. */
export const formatSignedCurrency = (change: number): string =>
  change > 0 ? `+${formatCurrency(change)}` : formatCurrency(change);

/**
 * Snapshot history, newest period first. A period's change is measured against
 * the period before it, so the oldest period has no change to show.
 */
export const toAccountHistoryRows = (
  snapshots: readonly AccountSnapshot[],
): AccountHistoryRowVM[] => {
  const ascending = [...snapshots].sort((a, b) => a.year - b.year || a.month - b.month);

  return ascending
    .map((snapshot, index): AccountHistoryRowVM => {
      const previous = ascending[index - 1];
      const change = previous === undefined ? undefined : snapshot.amount - previous.amount;
      return {
        id: snapshot.id,
        periodLabel: formatMonthLabel(snapshot.year, snapshot.month),
        balance: snapshot.amount,
        balanceText: formatCurrency(snapshot.amount),
        changeText: change === undefined ? ACCOUNT_VALUE_MISSING : formatSignedCurrency(change),
        changeTone: change === undefined ? 'muted' : change >= 0 ? 'positive' : 'negative',
        holdingsCount: snapshot.holdings?.length ?? 0,
        holdings: toHoldings(snapshot.holdings),
      };
    })
    .reverse();
};
