import React, { useEffect, useState } from 'react';

import type {
  Account,
  AccountBalanceInput,
  AccountSnapshot,
  CurrencyCode,
  Holding,
} from '../viewmodels/accountBalance.vm';
import {
  DataTable,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableCell,
  DataTableRow,
  DataTableScrollArea,
  NumberCell,
  NumberInput,
  parseOptionalAmount,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useExchangeRate } from '@/ui/hooks/useExchangeRate';
import { formatCurrency } from '@/ui/utils';

import {
  buildAccountBalanceSections,
  computeSectionInput,
  upsertSectionInput,
  type AccountBalanceSectionKind,
} from '../viewmodels/accountBalance.vm';

import { SecuritiesAccountRow } from './SecuritiesAccountRow';
import { ForeignMobileList, TwdMobileList } from './CloseAccountBalanceMobileLists';
import { AccountNameCell } from './AccountNameCell';

const SECTION_LABELS: Record<AccountBalanceSectionKind, string> = {
  twd: '現金 / 銀行',
  foreign: '外幣',
  securities: '證券',
};

const sectionTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

const sectionNoteClass =
  'text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground';

/**
 * 欄寬契約：總和必須等於 100（由 `DataTableColGroup` 在 dev 時守住）。
 * 同頁多表共用同一組常數以保持跨表同軸。
 */
const TWD_COLUMN_WIDTHS = [14, 22, 64] as const;
const FOREIGN_COLUMN_WIDTHS = [14, 22, 22, 8, 34] as const;

const SECTION_NOTES: Record<AccountBalanceSectionKind, string> = {
  twd: 'Ending balance at period end',
  foreign: 'TWD value is calculated automatically',
  securities: 'Market value is calculated from holdings',
};

interface TwdAccountRowProps {
  entry: {
    account: Account;
    previousBalance: number | null;
  };
  input: AccountBalanceInput | undefined;
  onAmountChange: (accountId: string, amount: number | undefined) => void;
}

const TwdAccountRow: React.FC<TwdAccountRowProps> = ({ entry, input, onAmountChange }) => {
  return (
    <DataTableRow>
      <DataTableCell>
        <AccountNameCell name={entry.account.name} currency="TWD" />
      </DataTableCell>
      <NumberCell value={entry.previousBalance} format={formatCurrency} />
      <DataTableCell>
        <div className="flex justify-end">
          <Label htmlFor={`ending-${entry.account.id}`} className="sr-only">
            期末餘額 {entry.account.name}
          </Label>
          <NumberInput
            id={`ending-${entry.account.id}`}
            className="w-full max-w-[220px]"
            value={input?.amount ?? ''}
            onChange={(event) =>
              onAmountChange(entry.account.id, parseOptionalAmount(event.target.value))
            }
          />
        </div>
      </DataTableCell>
    </DataTableRow>
  );
};

const TwdTableHead: React.FC = () => (
  <TableHeader>
    <DataTableHeadRow>
      <DataTableHeadCell>帳戶</DataTableHeadCell>
      <DataTableHeadCell align="number">前期餘額</DataTableHeadCell>
      <DataTableHeadCell align="number">期末餘額</DataTableHeadCell>
    </DataTableHeadRow>
  </TableHeader>
);

interface ForeignAccountRowProps {
  entry: {
    account: Account;
    previousBalance: number | null;
  };
  input: AccountBalanceInput | undefined;
  onDetailChange: (
    accountId: string,
    field: 'originalAmount' | 'exchangeRate',
    value: number | undefined,
  ) => void;
}

const ForeignAccountRow: React.FC<ForeignAccountRowProps> = ({
  entry,
  input,
  onDetailChange,
}) => {
  const originalAmount = input?.originalAmount ?? 0;
  const exchangeRate = input?.exchangeRate ?? 0;
  const twdValue = computeSectionInput(
    { accountId: entry.account.id, amount: 0, originalAmount, exchangeRate },
    'foreign',
  );

  return (
    <DataTableRow>
      <DataTableCell>
        <div className="flex items-baseline">
          <AccountNameCell name={entry.account.name} currency={entry.account.currency} />
        </div>
      </DataTableCell>
      <NumberCell
        value={entry.previousBalance}
        format={(value) => formatCurrency(value, entry.account.currency)}
      />
      <DataTableCell>
        <div className="flex justify-end">
          <Label htmlFor={`foreign-${entry.account.id}`} className="sr-only">
            外幣金額 {entry.account.name}
          </Label>
          <NumberInput
            id={`foreign-${entry.account.id}`}
            className="w-full max-w-[150px]"
            value={input?.originalAmount ?? ''}
            onChange={(event) =>
              onDetailChange(entry.account.id, 'originalAmount', parseOptionalAmount(event.target.value))
            }
          />
        </div>
      </DataTableCell>
      <DataTableCell>
        <div className="flex justify-end">
          <Label htmlFor={`rate-${entry.account.id}`} className="sr-only">
            匯率 {entry.account.name}
          </Label>
          <NumberInput
            id={`rate-${entry.account.id}`}
            step="0.0001"
            className="w-full max-w-[110px]"
            value={input?.exchangeRate ?? ''}
            onChange={(event) =>
              onDetailChange(entry.account.id, 'exchangeRate', parseOptionalAmount(event.target.value))
            }
          />
        </div>
      </DataTableCell>
      <DataTableCell align="number" className="font-medium text-foreground">
        <span data-testid={`twd-value-${entry.account.id}`}>{formatCurrency(twdValue)}</span>
      </DataTableCell>
    </DataTableRow>
  );
};

const ForeignTableHead: React.FC = () => (
  <TableHeader>
    <DataTableHeadRow>
      <DataTableHeadCell>帳戶</DataTableHeadCell>
      <DataTableHeadCell align="number">前期餘額</DataTableHeadCell>
      <DataTableHeadCell align="number">外幣金額</DataTableHeadCell>
      <DataTableHeadCell align="number">匯率</DataTableHeadCell>
      <DataTableHeadCell align="number">TWD 價值</DataTableHeadCell>
    </DataTableHeadRow>
  </TableHeader>
);

interface CloseAccountBalanceInputsProps {
  accounts: Account[];
  snapshots: Map<string, AccountSnapshot>;
  inputs: AccountBalanceInput[];
  onInputsChange: (inputs: AccountBalanceInput[]) => void;
}

const sectionKindOf = (accounts: Account[], accountId: string): AccountBalanceSectionKind => {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return 'twd';
  if (account.category === 'securities') return 'securities';
  if (account.currency !== 'TWD') return 'foreign';
  return 'twd';
};

export const CloseAccountBalanceInputs: React.FC<CloseAccountBalanceInputsProps> = ({
  accounts,
  snapshots,
  inputs,
  onInputsChange,
}) => {
  const { getRate } = useExchangeRate();
  const [rateError, setRateError] = useState<string | null>(null);

  const findInput = (accountId: string): AccountBalanceInput | undefined =>
    inputs.find((item) => item.accountId === accountId);

  const patchInput = (accountId: string, patch: Partial<AccountBalanceInput>): void => {
    const kind = sectionKindOf(accounts, accountId);
    const current = findInput(accountId);
    const merged: AccountBalanceInput = {
      accountId,
      amount: current?.amount ?? 0,
      ...current,
      ...patch,
    };
    onInputsChange(
      upsertSectionInput(inputs, { ...merged, amount: computeSectionInput(merged, kind) }, kind),
    );
  };

  const onTwdAmountChange = (accountId: string, amount: number | undefined): void => {
    if (amount === undefined) {
      onInputsChange(inputs.filter((item) => item.accountId !== accountId));
      return;
    }
    patchInput(accountId, { amount });
  };

  const onForeignDetailChange = (
    accountId: string,
    field: 'originalAmount' | 'exchangeRate',
    value: number | undefined,
  ): void => {
    if (value === undefined) return;
    patchInput(accountId, { [field]: field === 'exchangeRate' ? Number(value.toFixed(4)) : value });
  };

  const onHoldingsChange = (accountId: string, holdings: Holding[]): void => {
    patchInput(accountId, { holdings });
  };

  const onSecuritiesRateChange = (accountId: string, value: number | undefined): void => {
    patchInput(accountId, { exchangeRate: value });
  };

  const foreignAccounts = accounts.filter((account) => account.currency !== 'TWD');

  useEffect(() => {
    let cancelled = false;
    for (const account of foreignAccounts) {
      if (findInput(account.id)?.exchangeRate !== undefined) continue;
      void (async () => {
        const rate = await getRate(account.currency as CurrencyCode, 'TWD');
        if (cancelled || !rate.ok) {
          if (!cancelled && !rate.ok) setRateError('取得匯率失敗，請稍後再試或手動輸入匯率');
          return;
        }
        if (findInput(account.id)?.exchangeRate !== undefined) return;
        patchInput(account.id, { exchangeRate: Number(rate.value.toFixed(4)) });
      })();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreignAccounts.map((account) => account.id + account.currency).join(',')]);

  const sections = buildAccountBalanceSections({ accounts, snapshots });

  return (
    <div className="space-y-0">
      {sections.map((section) => (
        <section key={section.kind} className="space-y-4 border-b border-border pb-[30px] pt-[30px] first:pt-0 last:border-b-0 last:pb-0">
          <div className="flex items-baseline justify-between">
            <p className={sectionTitleClass}>{SECTION_LABELS[section.kind]}</p>
            <p className={sectionNoteClass}>{SECTION_NOTES[section.kind]}</p>
          </div>
          {section.kind === 'twd' && section.accounts.length > 0 && (
            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={TWD_COLUMN_WIDTHS} />
                <TwdTableHead />
                <TableBody>
                  {section.accounts.map((entry) => (
                    <TwdAccountRow
                      key={entry.account.id}
                      entry={entry}
                      input={findInput(entry.account.id)}
                      onAmountChange={onTwdAmountChange}
                    />
                  ))}
                </TableBody>
              </DataTable>
            </DataTableScrollArea>
          )}
          {section.kind === 'twd' && section.accounts.length > 0 && (
            <TwdMobileList
              accounts={section.accounts}
              findInput={findInput}
              onAmountChange={onTwdAmountChange}
            />
          )}
          {section.kind === 'foreign' && section.accounts.length > 0 && (
            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={FOREIGN_COLUMN_WIDTHS} />
                <ForeignTableHead />
                <TableBody>
                  {section.accounts.map((entry) => (
                    <ForeignAccountRow
                      key={entry.account.id}
                      entry={entry}
                      input={findInput(entry.account.id)}
                      onDetailChange={onForeignDetailChange}
                    />
                  ))}
                </TableBody>
              </DataTable>
            </DataTableScrollArea>
          )}
          {section.kind === 'foreign' && section.accounts.length > 0 && (
            <ForeignMobileList
              accounts={section.accounts}
              findInput={findInput}
              onDetailChange={onForeignDetailChange}
            />
          )}
          {section.kind === 'securities' &&
            section.accounts.map((entry) => (
              <SecuritiesAccountRow
                key={entry.account.id}
                entry={entry}
                input={findInput(entry.account.id)}
                previousHoldings={snapshots.get(entry.account.id)?.holdings ?? []}
                onHoldingsChange={onHoldingsChange}
                onRateChange={onSecuritiesRateChange}
              />
            ))}
        </section>
      ))}
      {rateError && <p className="text-xs text-destructive">{rateError}</p>}
      {accounts.length === 0 && (
        <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>
      )}
    </div>
  );
};

export default CloseAccountBalanceInputs;
