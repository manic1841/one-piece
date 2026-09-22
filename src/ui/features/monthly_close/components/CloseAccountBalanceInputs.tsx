import React, { useState } from 'react';

import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, AccountSnapshot, Holding } from '@/domains/account/types/account';
import { type CurrencyCode } from '@/domains/exchange_rate/types';

import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { useExchangeRate } from '@/ui/hooks/useExchangeRate';
import { formatCurrency } from '@/ui/utils';

import {
  buildAccountBalanceSections,
  computeSectionInput,
  upsertSectionInput,
  type AccountBalanceSectionKind,
} from '../viewmodels/accountBalance.vm';

import { SecuritiesAccountRow } from './SecuritiesAccountRow';

const SECTION_LABELS: Record<AccountBalanceSectionKind, string> = {
  twd: '現金 / 銀行',
  foreign: '外幣',
  securities: '證券',
};

const sectionLabelClass =
  'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground';

const amountText = (value: number, currency: string): string =>
  currency === 'TWD' ? formatCurrency(value) : `${value.toLocaleString('en-US')} ${currency}`;

const EntryStatus: React.FC<{ verified: boolean }> = ({ verified }) =>
  verified ? (
    <StatusGlyph type="verified" label="VERIFIED" />
  ) : (
    <StatusGlyph type="waiting" label="WAITING" />
  );

interface TwdAccountRowProps {
  entry: {
    account: Account;
    previousBalance: number | null;
    verified: boolean;
  };
  input: AccountBalanceInput | undefined;
  onAmountChange: (accountId: string, amount: number | undefined) => void;
}

const TwdAccountRow: React.FC<TwdAccountRowProps> = ({ entry, input, onAmountChange }) => {
  const missingBalance = input === undefined || input.amount === 0;

  return (
    <div className="space-y-2 md:grid md:grid-cols-[minmax(8rem,1fr)_auto_auto] md:items-end md:gap-4">
      <div className="text-sm font-medium text-foreground">{entry.account.name}</div>
      <div className="md:text-right">
        <p className={sectionLabelClass}>前期餘額</p>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {entry.previousBalance === null ? '—' : formatCurrency(entry.previousBalance)}
        </p>
      </div>
      <div className="space-y-1">
        <p className={sectionLabelClass}>期末餘額</p>
        <Label htmlFor={`ending-${entry.account.id}`} className="sr-only">
          期末餘額 {entry.account.name}
        </Label>
        <Input
          id={`ending-${entry.account.id}`}
          type="number"
          inputMode="decimal"
          className="w-36 text-right font-mono tabular-nums"
          value={input?.amount ?? ''}
          onChange={(event) =>
            onAmountChange(
              entry.account.id,
              event.target.value === '' ? undefined : Number(event.target.value),
            )
          }
        />
        {!entry.verified && missingBalance && (
          <p className="text-xs text-muted-foreground">需期末餘額</p>
        )}
      </div>
      <div className="flex items-center justify-end md:col-start-4">
        <EntryStatus verified={entry.verified} />
      </div>
    </div>
  );
};

interface ForeignAccountRowProps {
  entry: {
    account: Account;
    previousBalance: number | null;
    verified: boolean;
  };
  input: AccountBalanceInput | undefined;
  onDetailChange: (
    accountId: string,
    field: 'originalAmount' | 'exchangeRate',
    value: number | undefined,
  ) => void;
  onFetchRate: (accountId: string, currency: string) => void;
  fetchingRate: boolean;
}

const ForeignAccountRow: React.FC<ForeignAccountRowProps> = ({
  entry,
  input,
  onDetailChange,
  onFetchRate,
  fetchingRate,
}) => {
  const originalAmount = input?.originalAmount ?? 0;
  const exchangeRate = input?.exchangeRate ?? 0;
  const twdValue = computeSectionInput(
    { accountId: entry.account.id, amount: 0, originalAmount, exchangeRate },
    'foreign',
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">{entry.account.name}</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fetchingRate || entry.verified}
            onClick={() => onFetchRate(entry.account.id, entry.account.currency)}
          >
            取得匯率
          </Button>
          <EntryStatus verified={entry.verified} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4 md:items-end">
        <div>
          <p className={sectionLabelClass}>前期餘額</p>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {entry.previousBalance === null
              ? '—'
              : amountText(entry.previousBalance, entry.account.currency)}
          </p>
        </div>
        <div className="space-y-1">
          <p className={sectionLabelClass}>外幣金額</p>
          <Label htmlFor={`foreign-${entry.account.id}`} className="sr-only">
            外幣金額 {entry.account.name}
          </Label>
          <Input
            id={`foreign-${entry.account.id}`}
            type="number"
            inputMode="decimal"
            className="text-right font-mono tabular-nums"
            value={input?.originalAmount ?? ''}
            onChange={(event) =>
              onDetailChange(
                entry.account.id,
                'originalAmount',
                event.target.value === '' ? undefined : Number(event.target.value),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <p className={sectionLabelClass}>匯率</p>
          <Label htmlFor={`rate-${entry.account.id}`} className="sr-only">
            匯率 {entry.account.name}
          </Label>
          <Input
            id={`rate-${entry.account.id}`}
            type="number"
            inputMode="decimal"
            step="0.0001"
            className="text-right font-mono tabular-nums"
            value={input?.exchangeRate ?? ''}
            onChange={(event) =>
              onDetailChange(
                entry.account.id,
                'exchangeRate',
                event.target.value === '' ? undefined : Number(event.target.value),
              )
            }
          />
        </div>
        <div>
          <p className={sectionLabelClass}>TWD 價值</p>
          <p
            data-testid={`twd-value-${entry.account.id}`}
            className="font-mono text-sm font-medium tabular-nums text-foreground"
          >
            {formatCurrency(twdValue)}
          </p>
          {!entry.verified && (originalAmount === 0 || exchangeRate === 0) && (
            <p className="text-xs text-muted-foreground">需金額與匯率</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface CloseAccountBalanceInputsProps {
  accounts: Account[];
  snapshots: Map<string, AccountSnapshot>;
  inputs: AccountBalanceInput[];
  stageCompleted: boolean;
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
  stageCompleted,
  onInputsChange,
}) => {
  const { getRate, loading: fetchingRate } = useExchangeRate();
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
    patchInput(accountId, { [field]: value });
  };

  const onHoldingsChange = (accountId: string, holdings: Holding[]): void => {
    patchInput(accountId, { holdings });
  };

  const onSecuritiesRateChange = (accountId: string, value: number | undefined): void => {
    patchInput(accountId, { exchangeRate: value });
  };

  const onFetchRate = async (accountId: string, currency: string): Promise<void> => {
    if (currency === 'TWD') return;
    setRateError(null);
    const rate = await getRate(currency as CurrencyCode, 'TWD');
    if (rate === undefined) {
      setRateError('取得匯率失敗，請稍後再試或手動輸入匯率');
      return;
    }
    patchInput(accountId, { exchangeRate: rate });
  };

  const sections = buildAccountBalanceSections({ accounts, snapshots, stageCompleted });

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.kind} className="space-y-3">
          <p className={sectionLabelClass}>{SECTION_LABELS[section.kind]}</p>
          {section.kind === 'twd' &&
            section.accounts.map((entry) => (
              <TwdAccountRow
                key={entry.account.id}
                entry={entry}
                input={findInput(entry.account.id)}
                onAmountChange={onTwdAmountChange}
              />
            ))}
          {section.kind === 'foreign' &&
            section.accounts.map((entry) => (
              <ForeignAccountRow
                key={entry.account.id}
                entry={entry}
                input={findInput(entry.account.id)}
                onDetailChange={onForeignDetailChange}
                onFetchRate={onFetchRate}
                fetchingRate={fetchingRate}
              />
            ))}
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
      {accounts.length === 0 && <p className="text-xs text-muted-foreground">尚無階段證據。</p>}
    </div>
  );
};

export default CloseAccountBalanceInputs;
