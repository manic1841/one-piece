import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { ACCOUNT_BALANCE_MISSING, ACCOUNT_VALUE_MISSING } from '@/ui/constants/account/pageLabels';
import { formatCurrency, formatMonthLabel } from '@/ui/utils';

export { AccountCategory };
export type { AccountWithSnapshot };

/** The household's base currency; snapshot `amount` is already folded into it. */
const BASE_CURRENCY: string = CurrencyType.TWD;

export interface AccountRowVM {
  id: string;
  name: string;
  category: AccountCategory;
  isActive: boolean;
  /** The account's own currency, e.g. "USD". */
  currency: string;
  /** True when the account is not held in the base currency. */
  isForeignCurrency: boolean;
  /** Closing balance in the base currency; 0 when the account has no snapshot. */
  balance: number;
  balanceText: string;
  /** Closing period, e.g. "SEP 2026"; `—` when the account has no snapshot. */
  periodLabel: string;
}

export const toAccountRowVM = (account: AccountWithSnapshot): AccountRowVM => {
  const balance = account.snapshot?.amount;
  return {
    id: account.id,
    name: account.name,
    category: account.category,
    isActive: account.isActive !== false,
    currency: account.currency,
    isForeignCurrency: account.currency !== BASE_CURRENCY,
    balance: balance ?? 0,
    balanceText: balance === undefined ? ACCOUNT_BALANCE_MISSING : formatCurrency(balance),
    periodLabel:
      account.snapshot === null || account.snapshot === undefined
        ? ACCOUNT_VALUE_MISSING
        : formatMonthLabel(account.snapshot.year, account.snapshot.month),
  };
};

/** Categories the list groups by, in display order. */
export const ACCOUNT_CATEGORY_SECTIONS = [
  AccountCategory.CASH,
  AccountCategory.BANK,
  AccountCategory.SECURITIES,
] as const;

/** Group rows into the non-empty category sections, preserving row order. */
export const groupAccountRows = (
  rows: readonly AccountRowVM[],
): { category: AccountCategory; rows: AccountRowVM[] }[] =>
  ACCOUNT_CATEGORY_SECTIONS.map((category) => ({
    category,
    rows: rows.filter((row) => row.category === category),
  })).filter((section) => section.rows.length > 0);

/** Household total in the base currency; 停用 accounts are excluded. */
export const accountTotalBalance = (rows: readonly AccountRowVM[]): number =>
  rows.reduce((sum, row) => sum + (row.isActive ? row.balance : 0), 0);
