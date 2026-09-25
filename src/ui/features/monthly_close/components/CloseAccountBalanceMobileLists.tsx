import React from 'react';

import {
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  NumberInput,
  parseOptionalAmount,
} from '@/ui/components/data-table';
import { formatCurrency } from '@/ui/utils';

import type { AccountBalanceEntryVM, AccountBalanceInput } from '../viewmodels/accountBalance.vm';
import { computeSectionInput } from '../viewmodels/accountBalance.vm';
import { AccountNameCell } from './AccountNameCell';

interface TwdMobileListProps {
  accounts: AccountBalanceEntryVM[];
  findInput: (accountId: string) => AccountBalanceInput | undefined;
  onAmountChange: (accountId: string, amount: number | undefined) => void;
}

export const TwdMobileList: React.FC<TwdMobileListProps> = ({
  accounts,
  findInput,
  onAmountChange,
}) => (
  <MobileDataList>
    {accounts.map((entry) => (
      <MobileDataRow key={entry.account.id}>
        <p className="text-sm font-medium text-foreground">
          <AccountNameCell name={entry.account.name} currency="TWD" />
        </p>
        <MobileDataField label="前期餘額">
          <p className="font-mono text-sm tabular-nums text-foreground">
            {entry.previousBalance === null ? '—' : formatCurrency(entry.previousBalance)}
          </p>
        </MobileDataField>
        <MobileDataField label="期末餘額">
          <NumberInput
            aria-label={`期末餘額 ${entry.account.name}`}
            className="w-[150px] max-w-full"
            value={findInput(entry.account.id)?.amount ?? ''}
            onChange={(event) =>
              onAmountChange(entry.account.id, parseOptionalAmount(event.target.value))
            }
          />
        </MobileDataField>
      </MobileDataRow>
    ))}
  </MobileDataList>
);

interface ForeignMobileListProps {
  accounts: AccountBalanceEntryVM[];
  findInput: (accountId: string) => AccountBalanceInput | undefined;
  onDetailChange: (
    accountId: string,
    field: 'originalAmount' | 'exchangeRate',
    value: number | undefined,
  ) => void;
}

export const ForeignMobileList: React.FC<ForeignMobileListProps> = ({
  accounts,
  findInput,
  onDetailChange,
}) => (
  <MobileDataList>
    {accounts.map((entry) => (
      <MobileDataRow key={entry.account.id}>
        <p className="text-sm font-medium text-foreground">
          <AccountNameCell name={entry.account.name} currency={entry.account.currency} />
        </p>
        <MobileDataField label="前期餘額">
          <p className="font-mono text-sm tabular-nums text-foreground">
            {entry.previousBalance === null
              ? '—'
              : formatCurrency(entry.previousBalance, entry.account.currency)}
          </p>
        </MobileDataField>
        <MobileDataField label="外幣金額">
          <NumberInput
            aria-label={`外幣金額 ${entry.account.name}`}
            className="w-[150px] max-w-full"
            value={findInput(entry.account.id)?.originalAmount ?? ''}
            onChange={(event) =>
              onDetailChange(
                entry.account.id,
                'originalAmount',
                parseOptionalAmount(event.target.value),
              )
            }
          />
        </MobileDataField>
        <MobileDataField label="匯率">
          <NumberInput
            aria-label={`匯率 ${entry.account.name}`}
            step="0.0001"
            className="w-[150px] max-w-full"
            value={findInput(entry.account.id)?.exchangeRate ?? ''}
            onChange={(event) =>
              onDetailChange(
                entry.account.id,
                'exchangeRate',
                parseOptionalAmount(event.target.value),
              )
            }
          />
        </MobileDataField>
        <MobileDataField label="TWD 價值">
          <p
            data-testid={`twd-value-${entry.account.id}`}
            className="font-mono text-sm font-medium tabular-nums text-foreground"
          >
            {formatCurrency(
              computeSectionInput(
                {
                  accountId: entry.account.id,
                  amount: 0,
                  originalAmount: findInput(entry.account.id)?.originalAmount ?? 0,
                  exchangeRate: findInput(entry.account.id)?.exchangeRate ?? 0,
                },
                'foreign',
              ),
            )}
          </p>
        </MobileDataField>
      </MobileDataRow>
    ))}
  </MobileDataList>
);
