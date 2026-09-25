import React from 'react';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type { DebtRepaymentInput } from '../viewmodels/monthlyClose.vm';

/** Mid-month date inside the closing period; close-input events must land in the closed month. */
const closeMonthDate = (yearMonth: string): Date =>
  new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)) - 1, 15);

export interface CloseStageInputsProps {
  stageId: string;
  /** The closing period (YYYY-MM); close-input transactions must be dated inside it. */
  yearMonth: string;
  portfolios: { id: string; name: string }[];
  debtAccounts: { id: string; name: string; currentBalance: number }[];
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  repayments: DebtRepaymentInput[];
  onPortfolioCashFlowsChange: (
    inputs: Record<string, { deposits: number; withdrawals: number }>,
  ) => void;
  onRepaymentsChange: (inputs: DebtRepaymentInput[]) => void;
  disabled: boolean;
}

export const CloseStageInputs: React.FC<CloseStageInputsProps> = ({
  stageId,
  yearMonth,
  portfolios,
  debtAccounts,
  portfolioCashFlows,
  repayments,
  onPortfolioCashFlowsChange,
  onRepaymentsChange,
  disabled,
}) => {
  // SECURITIES_TRADE renders its own two TradeTables in the page, not here.

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
                  [portfolio.id]: {
                    deposits,
                    withdrawals: portfolioCashFlows[portfolio.id]?.withdrawals ?? 0,
                  },
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
                  [portfolio.id]: {
                    deposits: portfolioCashFlows[portfolio.id]?.deposits ?? 0,
                    withdrawals,
                  },
                });
              }}
            />
          </div>
        ))}
        {portfolios.length === 0 && (
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>
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
              value={
                repayments.find((item) => item.debtAccountId === debtAccount.id)?.totalPayment ?? ''
              }
              onChange={(event) => {
                const totalPayment = Number(event.target.value);
                const next = repayments.filter((item) => item.debtAccountId !== debtAccount.id);
                if (!Number.isNaN(totalPayment) && totalPayment > 0) {
                  next.push({
                    debtAccountId: debtAccount.id,
                    totalPayment,
                    date: closeMonthDate(yearMonth),
                  });
                }
                onRepaymentsChange(next);
              }}
            />
          </div>
        ))}
        {debtAccounts.length === 0 && (
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>
        )}
      </div>
    );
  }

  return null;
};
