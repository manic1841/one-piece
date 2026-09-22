import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, AccountSnapshot, Holding } from '@/domains/account/types/account';

export type AccountBalanceSectionKind = 'twd' | 'foreign' | 'securities';

export interface AccountBalanceEntryVM {
  account: Account;
  /** Previous-month observation; foreign accounts expose the foreign amount. */
  previousBalance: number | null;
  /** Per-account status derived from the stage state; never persisted. */
  verified: boolean;
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
  stageCompleted: boolean;
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
  stageCompleted,
}: BuildSectionsParams): AccountBalanceSectionVM[] => {
  const entriesByKind = new Map<AccountBalanceSectionKind, AccountBalanceEntryVM[]>(
    SECTION_ORDER.map((kind) => [kind, []]),
  );

  for (const account of accounts) {
    const previous = snapshots.get(account.id) ?? null;
    const isForeign = account.currency !== 'TWD';
    entriesByKind.get(sectionKindOf(account))?.push({
      account,
      previousBalance: previous
        ? isForeign
          ? (previous.originalAmount ?? previous.amount)
          : previous.amount
        : null,
      verified: stageCompleted,
      canImportPrevious: (previous?.holdings?.length ?? 0) > 0,
    });
  }

  return SECTION_ORDER.filter((kind) => (entriesByKind.get(kind)?.length ?? 0) > 0).map((kind) => ({
    kind,
    accounts: entriesByKind.get(kind) ?? [],
  }));
};

export const computeSectionInput = (
  input: AccountBalanceInput,
  kind: AccountBalanceSectionKind,
): number => {
  if (kind === 'securities') {
    const sum = (input.holdings ?? []).reduce(
      (sum, holding) => sum + (holding.marketValue || 0),
      0,
    );
    return input.exchangeRate !== undefined ? sum * input.exchangeRate : sum;
  }
  if (kind === 'foreign') {
    return (input.originalAmount ?? 0) * (input.exchangeRate ?? 0);
  }
  return input.amount;
};

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

export type { Holding };
