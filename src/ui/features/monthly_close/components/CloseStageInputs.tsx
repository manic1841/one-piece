import React from 'react';

import { NumberInput, parseOptionalAmount } from '@/ui/components/data-table';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { closeMonthDate } from '../hooks/useDebtRepaymentPrefill';
import {
  type DebtSectionMetaVM,
  buildDebtPaymentSections,
  buildDebtPaymentTotal,
} from '../viewmodels/debtPayment.vm';
import type { DebtRepaymentInput } from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import {
  buildPortfolioCashFlowSections,
  buildPortfolioCashFlowTotal,
} from '../viewmodels/portfolioCashFlow.vm';
import { PortfolioCashFlowAccordion, PortfolioCashFlowSection } from './PortfolioCashFlowSection';

export interface CloseStageInputsProps {
  stageId: string;
  /** The closing period (YYYY-MM); close-input transactions must be dated inside it. */
  yearMonth: string;
  portfolios: { id: string; name: string }[];
  /** Read-only debt inputs: rate, opening balance, and system-calculated display data. */
  debtAccounts: DebtSectionMetaVM[];
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
    if (debtAccounts.length === 0) {
      return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;
    }

    const sections = buildDebtPaymentSections({ debtAccounts, repayments });
    const total = buildDebtPaymentTotal(sections);

    const handleTotalPaymentChange = (debtAccountId: string, value: number) => {
      const next = repayments.filter((item) => item.debtAccountId !== debtAccountId);
      next.push({
        debtAccountId,
        totalPayment: value,
        date: closeMonthDate(yearMonth),
      });
      onRepaymentsChange(next);
    };

    return (
      <div className="space-y-6">
        {sections.map((section, index) => (
          <React.Fragment key={section.debtAccountId}>
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">{section.debtAccountName}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.INTEREST_RATE}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {section.interestRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.PREVIOUS_BALANCE}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(section.openingBalance)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {MONTHLY_CLOSE_LABELS.TOTAL_PAYMENT}
                </Label>
                <NumberInput
                  disabled={disabled}
                  placeholder="0"
                  aria-label={`${MONTHLY_CLOSE_LABELS.TOTAL_PAYMENT} ${section.debtAccountName}`}
                  value={section.totalPayment > 0 ? section.totalPayment.toString() : ''}
                  onChange={(event) =>
                    handleTotalPaymentChange(
                      section.debtAccountId,
                      parseOptionalAmount(event.target.value) ?? 0,
                    )
                  }
                />
                {section.warning && <p className="text-[10px] text-warning">{section.warning}</p>}
                {section.blockedReason && (
                  <p className="text-[10px] text-negative" role="alert">
                    {section.blockedReason}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.INTEREST}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(section.interest)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.PRINCIPAL}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(section.principal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.MONTHLY_DUE}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(section.monthlyDue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(section.closingBalance)}
                  </p>
                </div>
              </div>
            </div>
            {index < sections.length - 1 && <div className="border-t border-border" />}
          </React.Fragment>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.DEBT_TOTAL}
          </p>
          <div className="flex items-center gap-4">
            <p className="font-mono text-sm tabular-nums text-foreground">
              {formatCurrency(total.principal)}
            </p>
            <p className="font-mono text-sm tabular-nums text-foreground">
              {formatCurrency(total.interest)}
            </p>
            <p className="font-mono text-sm tabular-nums text-foreground">
              {formatCurrency(total.total)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
