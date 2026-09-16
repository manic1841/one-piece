import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

import type {
  AccountBalanceInput,
  DebtRepaymentInput,
  SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';

export interface CloseStageInputsProps {
  stageId: string;
  accounts: { id: string; name: string }[];
  portfolios: { id: string; name: string }[];
  debtAccounts: { id: string; name: string; currentBalance: number }[];
  accountBalances: AccountBalanceInput[];
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  repayments: DebtRepaymentInput[];
  onAccountBalancesChange: (inputs: AccountBalanceInput[]) => void;
  onSecuritiesChange: (inputs: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] }) => void;
  onPortfolioCashFlowsChange: (inputs: Record<string, { deposits: number; withdrawals: number }>) => void;
  onRepaymentsChange: (inputs: DebtRepaymentInput[]) => void;
  disabled: boolean;
}

export const CloseStageInputs: React.FC<CloseStageInputsProps> = ({
  stageId,
  accounts,
  portfolios,
  debtAccounts,
  accountBalances,
  securities,
  portfolioCashFlows,
  repayments,
  onAccountBalancesChange,
  onSecuritiesChange,
  onPortfolioCashFlowsChange,
  onRepaymentsChange,
  disabled,
}) => {
  if (stageId === 'ACCOUNT_BALANCE') {
    return (
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 truncate text-xs">{account.name}</Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              value={accountBalances.find((item) => item.accountId === account.id)?.amount ?? ''}
              onChange={(event) => {
                const amount = event.target.value === '' ? undefined : Number(event.target.value);
                const next = accountBalances.filter((item) => item.accountId !== account.id);
                if (amount !== undefined && !Number.isNaN(amount)) {
                  next.push({ accountId: account.id, amount });
                }
                onAccountBalancesChange(next);
              }}
            />
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_EVIDENCE}</p>
        )}
      </div>
    );
  }

  if (stageId === 'SECURITIES_TRADE') {
    return (
      <div className="space-y-3">
        {(['buys', 'sells'] as const).map((side) => (
          <div key={side} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 text-xs">
              {side === 'buys' ? MONTHLY_CLOSE_LABELS.BUY : MONTHLY_CLOSE_LABELS.SELL}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              placeholder="0"
              value={securities[side][0]?.amount ?? ''}
              onChange={(event) => {
                const amount = Number(event.target.value);
                if (Number.isNaN(amount)) return;
                onSecuritiesChange({
                  ...securities,
                  [side]: amount > 0 ? [{ amount, date: new Date() }] : [],
                });
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (stageId === 'PORTFOLIO_CASH_FLOW') {
    return (
      <div className="space-y-3">
        {portfolios.map((portfolio) => (
          <div key={portfolio.id} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 truncate text-xs">{portfolio.name}</Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              placeholder="0"
              value={portfolioCashFlows[portfolio.id]?.deposits ?? ''}
              onChange={(event) => {
                const deposits = Number(event.target.value) || 0;
                onPortfolioCashFlowsChange({
                  ...portfolioCashFlows,
                  [portfolio.id]: { deposits, withdrawals: portfolioCashFlows[portfolio.id]?.withdrawals ?? 0 },
                });
              }}
            />
            <Input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              placeholder="0"
              value={portfolioCashFlows[portfolio.id]?.withdrawals ?? ''}
              onChange={(event) => {
                const withdrawals = Number(event.target.value) || 0;
                onPortfolioCashFlowsChange({
                  ...portfolioCashFlows,
                  [portfolio.id]: { deposits: portfolioCashFlows[portfolio.id]?.deposits ?? 0, withdrawals },
                });
              }}
            />
          </div>
        ))}
        {portfolios.length === 0 && (
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_EVIDENCE}</p>
        )}
      </div>
    );
  }

  if (stageId === 'DEBT_REPAYMENT') {
    return (
      <div className="space-y-3">
        {debtAccounts.map((debtAccount) => (
          <div key={debtAccount.id} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 truncate text-xs">{debtAccount.name}</Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              placeholder="0"
              value={repayments.find((item) => item.debtAccountId === debtAccount.id)?.totalPayment ?? ''}
              onChange={(event) => {
                const totalPayment = Number(event.target.value);
                const next = repayments.filter((item) => item.debtAccountId !== debtAccount.id);
                if (!Number.isNaN(totalPayment) && totalPayment > 0) {
                  next.push({ debtAccountId: debtAccount.id, totalPayment, date: new Date() });
                }
                onRepaymentsChange(next);
              }}
            />
          </div>
        ))}
        {debtAccounts.length === 0 && (
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_EVIDENCE}</p>
        )}
      </div>
    );
  }

  return null;
};
