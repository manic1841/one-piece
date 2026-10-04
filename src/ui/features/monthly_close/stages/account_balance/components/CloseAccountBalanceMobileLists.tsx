import React from 'react';

import {
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  NumberInput,
  parseOptionalAmount,
} from '@/ui/components/data-table';
import { ACCOUNT_BALANCE_FIELD_LABELS, MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type {
  AccountBalanceEntryVM,
  AccountBalanceInput,
} from '../../../viewmodels/accountBalance.vm';
import { foreignTwdValueText } from '../../../viewmodels/accountBalance.vm';
import { AccountNameCell } from './AccountNameCell';

interface TwdMobileListProps {
  accounts: AccountBalanceEntryVM[];
  findInput: (accountId: string) => AccountBalanceInput | undefined;
  isReadOnly: boolean;
  onAmountChange: (accountId: string, amount: number | undefined) => void;
}

export const TwdMobileList: React.FC<TwdMobileListProps> = ({
  accounts,
  findInput,
  isReadOnly,
  onAmountChange,
}) => (
  <MobileDataList>
    {accounts.map((entry) => (
      <MobileDataRow key={entry.account.id}>
        <p className="text-sm font-medium text-foreground">
          <AccountNameCell name={entry.account.name} currency="TWD" />
        </p>
        <MobileDataField label={ACCOUNT_BALANCE_FIELD_LABELS.PREVIOUS_MONTH_BALANCE}>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {entry.previousBalanceText}
          </p>
        </MobileDataField>
        <MobileDataField label={MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}>
          <NumberInput
            aria-label={`${MONTHLY_CLOSE_LABELS.CLOSING_BALANCE} ${entry.account.name}`}
            className="w-[150px] max-w-full"
            disabled={isReadOnly}
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
  isReadOnly: boolean;
  onDetailChange: (
    accountId: string,
    field: 'originalAmount' | 'exchangeRate',
    value: number | undefined,
  ) => void;
}

export const ForeignMobileList: React.FC<ForeignMobileListProps> = ({
  accounts,
  findInput,
  isReadOnly,
  onDetailChange,
}) => (
  <MobileDataList>
    {accounts.map((entry) => (
      <MobileDataRow key={entry.account.id}>
        <p className="text-sm font-medium text-foreground">
          <AccountNameCell name={entry.account.name} currency={entry.account.currency} />
        </p>
        <MobileDataField label={ACCOUNT_BALANCE_FIELD_LABELS.PREVIOUS_MONTH_BALANCE}>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {entry.previousBalanceText}
          </p>
        </MobileDataField>
        <MobileDataField label={ACCOUNT_BALANCE_FIELD_LABELS.FOREIGN_AMOUNT}>
          <NumberInput
            aria-label={`${ACCOUNT_BALANCE_FIELD_LABELS.FOREIGN_AMOUNT} ${entry.account.name}`}
            className="w-[150px] max-w-full"
            disabled={isReadOnly}
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
        <MobileDataField label={ACCOUNT_BALANCE_FIELD_LABELS.EXCHANGE_RATE}>
          <NumberInput
            aria-label={`${ACCOUNT_BALANCE_FIELD_LABELS.EXCHANGE_RATE} ${entry.account.name}`}
            step="0.0001"
            className="w-[150px] max-w-full"
            disabled={isReadOnly}
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
        <MobileDataField label={ACCOUNT_BALANCE_FIELD_LABELS.TWD_VALUE}>
          <p
            data-testid={`twd-value-${entry.account.id}`}
            className="font-mono text-sm font-medium tabular-nums text-foreground"
          >
            {foreignTwdValueText(findInput(entry.account.id))}
          </p>
        </MobileDataField>
      </MobileDataRow>
    ))}
  </MobileDataList>
);
