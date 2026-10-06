import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, AccountSnapshot, Holding } from '@/domains/account/types/account';
import type { CurrencyCode } from '@/domains/exchange_rate/types';
import { formatCurrency, formatCurrencyOrDash } from '@/ui/utils';

export type { Account, AccountSnapshot, AccountBalanceInput, CurrencyCode, Holding };

export type AccountBalanceSectionKind = 'twd' | 'foreign' | 'securities';

export interface AccountBalanceEntryVM {
  account: Account;
  /** Previous-month observation; foreign accounts expose the foreign amount. */
  previousBalance: number | null;
  previousBalanceText: string;
  /** Previous-month holdings exist to copy as this month's starting data. */
  canImportPrevious: boolean;
}

export interface AccountBalanceSectionVM {
  kind: AccountBalanceSectionKind;
  accounts: AccountBalanceEntryVM[];
}

interface BuildSectionsParams {
  accounts: Account[];
  snapshots: Map<string, AccountSnapshot>;
}

const sectionKindOf = (account: Account): AccountBalanceSectionKind => {
  if (account.category === 'securities') return 'securities';
  if (account.currency !== 'TWD') return 'foreign';
  return 'twd';
};

const SECTION_ORDER: readonly AccountBalanceSectionKind[] = ['twd', 'foreign', 'securities'];

export const buildAccountBalanceSections = ({
  accounts,
  snapshots,
}: BuildSectionsParams): AccountBalanceSectionVM[] => {
  const entriesByKind = new Map<AccountBalanceSectionKind, AccountBalanceEntryVM[]>(
    SECTION_ORDER.map((kind) => [kind, []]),
  );

  for (const account of accounts) {
    const previous = snapshots.get(account.id) ?? null;
    const isForeign = account.currency !== 'TWD';
    const previousBalance = previous
      ? isForeign
        ? (previous.originalAmount ?? previous.amount)
        : previous.amount
      : null;
    entriesByKind.get(sectionKindOf(account))?.push({
      account,
      previousBalance,
      previousBalanceText: formatCurrencyOrDash(previousBalance, account.currency),
      canImportPrevious: (previous?.holdings?.length ?? 0) > 0,
    });
  }

  return SECTION_ORDER.filter((kind) => (entriesByKind.get(kind)?.length ?? 0) > 0).map((kind) => ({
    kind,
    accounts: entriesByKind.get(kind) ?? [],
  }));
};

export const computeHoldingsMarketValue = (input: AccountBalanceInput | undefined): number =>
  (input?.holdings ?? []).reduce((sum, holding) => sum + (holding.marketValue || 0), 0);

/**
 * Exchange rates are kept at four decimal places whether they are typed or
 * auto-fetched, so both paths normalise through here.
 */
export const roundExchangeRate = (value: number): number => Number(value.toFixed(4));

export const computeSectionInput = (
  input: AccountBalanceInput,
  kind: AccountBalanceSectionKind,
): number => {
  if (kind === 'securities') {
    const sum = computeHoldingsMarketValue(input);
    return input.exchangeRate !== undefined ? sum * input.exchangeRate : sum;
  }
  if (kind === 'foreign') {
    return (input.originalAmount ?? 0) * (input.exchangeRate ?? 0);
  }
  return input.amount;
};

/** A foreign account's typed amount at its rate, as TWD. */
export const foreignTwdValue = (input: AccountBalanceInput | undefined): number =>
  computeSectionInput(
    {
      accountId: input?.accountId ?? '',
      amount: 0,
      originalAmount: input?.originalAmount ?? 0,
      exchangeRate: input?.exchangeRate ?? 0,
    },
    'foreign',
  );

/** Holdings market value before any FX conversion, as displayed on the row. */
export const holdingsMarketValueText = (input: AccountBalanceInput | undefined): string =>
  formatCurrency(computeHoldingsMarketValue(input));

export const foreignTwdValueText = (input: AccountBalanceInput | undefined): string =>
  formatCurrency(foreignTwdValue(input));

export const securitiesTwdValueText = (input: AccountBalanceInput | undefined): string =>
  formatCurrency(computeSectionInput(input ?? { accountId: '', amount: 0 }, 'securities'));

export const upsertSectionInput = (
  inputs: AccountBalanceInput[],
  next: AccountBalanceInput,
  kind: AccountBalanceSectionKind,
): AccountBalanceInput[] => {
  const { holdings, ...base } = next;
  if (kind !== 'twd' && holdings) {
    return [...inputs.filter((item) => item.accountId !== next.accountId), { ...base, holdings }];
  }
  return [...inputs.filter((item) => item.accountId !== next.accountId), { ...base }];
};
