import React from 'react';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import type { DebtRepaymentInput } from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import {
  buildPortfolioCashFlowSections,
  buildPortfolioCashFlowTotal,
} from '../viewmodels/portfolioCashFlow.vm';
import { PortfolioCashFlowAccordion, PortfolioCashFlowSection } from './PortfolioCashFlowSection';

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
  /** Month-scoped portfolio snapshots for display; missing entries render null balances. */
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
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
  portfolioSnapshots,
  repayments,
  onPortfolioCashFlowsChange,
  onRepaymentsChange,
  disabled,
}) => {
  // SECURITIES_TRADE renders its own two TradeTables in the page, not here.

  const snapshotFor = (portfolioId: string) => portfolioSnapshots.get(portfolioId);

  const handleDepositsChange = (portfolioId: string, value: number) => {
    onPortfolioCashFlowsChange({
      ...portfolioCashFlows,
      [portfolioId]: {
        deposits: value,
        withdrawals:
          portfolioCashFlows[portfolioId]?.withdrawals ??
          snapshotFor(portfolioId)?.cashFlow.withdrawals ??
          0,
      },
    });
  };

  const handleWithdrawalsChange = (portfolioId: string, value: number) => {
    onPortfolioCashFlowsChange({
      ...portfolioCashFlows,
      [portfolioId]: {
        deposits:
          portfolioCashFlows[portfolioId]?.deposits ??
          snapshotFor(portfolioId)?.cashFlow.deposits ??
          0,
        withdrawals: value,
      },
    });
  };

  if (stageId === 'PORTFOLIO_CASH_FLOW') {
    const sections = buildPortfolioCashFlowSections({
      portfolios,
      snapshots: portfolioSnapshots,
      portfolioCashFlows,
    });
    const total = buildPortfolioCashFlowTotal(sections);

    if (portfolios.length === 0) {
      return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;
    }

    return (
      <div className="space-y-6">
        <div className="hidden md:block md:space-y-6">
          {sections.map((section, index) => (
            <React.Fragment key={section.portfolioId}>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{section.portfolioName}</p>
                <PortfolioCashFlowSection
                  section={section}
                  disabled={disabled}
                  onDepositsChange={handleDepositsChange}
                  onWithdrawalsChange={handleWithdrawalsChange}
                />
              </div>
              {index < sections.length - 1 && <div className="border-t border-border" />}
            </React.Fragment>
          ))}
        </div>
        <div className="md:hidden">
          <PortfolioCashFlowAccordion
            sections={sections}
            disabled={disabled}
            onDepositsChange={handleDepositsChange}
            onWithdrawalsChange={handleWithdrawalsChange}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.TOTAL_RETURN}
          </p>
          <div className="flex items-center gap-4">
            <p
              className={cn(
                'font-mono text-sm tabular-nums',
                total.gain > 0
                  ? 'text-positive'
                  : total.gain < 0
                    ? 'text-negative'
                    : 'text-foreground',
              )}
            >
              {formatCurrency(total.gain)}
            </p>
            <p
              className={cn(
                'font-mono text-sm tabular-nums',
                total.returnRate > 0
                  ? 'text-positive'
                  : total.returnRate < 0
                    ? 'text-negative'
                    : 'text-foreground',
              )}
            >
              {formatPercentage(total.returnRate, 2)}
            </p>
          </div>
        </div>
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
