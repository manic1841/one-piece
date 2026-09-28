import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type {
  Account,
  AccountBalanceInput,
  AccountSnapshot,
} from '../viewmodels/accountBalance.vm';
import { type DebtSectionMetaVM } from '../viewmodels/debtPayment.vm';
import type {
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import { CloseAccountBalanceInputs } from './CloseAccountBalanceInputs';
import { CloseStageInputs } from './CloseStageInputs';
import { TradeTable } from './TradeTable';
import { type TradeSide, type TradeTableRow } from './TradeTable';

const toTradeRows = (
  rows: (SecuritiesTradeInput | FinancingInput)[],
  side: TradeSide,
): TradeTableRow[] =>
  rows.map((row) => ({
    transactionId: row.transactionId,
    side,
    amount: row.amount,
    description: row.description,
    projectId: row.projectId,
    date: row.date,
  }));

type StageInputId =
  | 'ACCOUNT_BALANCE'
  | 'SECURITIES_TRADE'
  | 'PORTFOLIO_CASH_FLOW'
  | 'DEBT_REPAYMENT';

interface CloseStageInputsSectionProps {
  stageId: StageInputId;
  yearMonth: string;
  disabled: boolean;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  accountBalances: AccountBalanceInput[];
  setAccountBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  financing: { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };
  portfolios: { id: string; name: string }[];
  /** Opens the add/edit drawer for the securities or financing table. */
  onOpenTradeDrawer: (kind: 'SECURITIES' | 'FINANCING', row?: TradeTableRow) => void;
  debtSectionMetas: DebtSectionMetaVM[];
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  setPortfolioCashFlows: React.Dispatch<
    React.SetStateAction<Record<string, { deposits: number; withdrawals: number }>>
  >;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  repayments: DebtRepaymentInput[];
  setRepayments: React.Dispatch<React.SetStateAction<DebtRepaymentInput[]>>;
}

const sideLabels: Record<TradeSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.BUY,
  SELL: MONTHLY_CLOSE_LABELS.SELL,
};

const financingSideLabels: Record<TradeSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.SHAREHOLDER_FINANCING,
  SELL: MONTHLY_CLOSE_LABELS.DIVIDEND_PAYOUT,
};

export const CloseStageInputsSection: React.FC<CloseStageInputsSectionProps> = ({
  stageId,
  yearMonth,
  disabled,
  accounts,
  accountSnapshots,
  accountBalances,
  setAccountBalances,
  securities,
  financing,
  portfolios,
  onOpenTradeDrawer,
  debtSectionMetas,
  portfolioCashFlows,
  setPortfolioCashFlows,
  portfolioSnapshots,
  repayments,
  setRepayments,
}) => {
  const projectNameOf = (projectId: string | null | undefined) =>
    portfolios.find((portfolio) => portfolio.id === projectId)?.name ?? null;

  if (stageId === 'ACCOUNT_BALANCE') {
    return (
      <CloseAccountBalanceInputs
        accounts={accounts}
        snapshots={accountSnapshots}
        inputs={accountBalances}
        onInputsChange={setAccountBalances}
      />
    );
  }
  if (stageId === 'SECURITIES_TRADE') {
    return (
      <div className="space-y-6">
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.SECURITIES_TRANSACTIONS}
          sideLabels={sideLabels}
          rows={toTradeRows([...securities.buys, ...securities.sells], 'BUY')}
          projectIdName={projectNameOf}
          onAdd={() => onOpenTradeDrawer('SECURITIES')}
          onRowClick={(row) => onOpenTradeDrawer('SECURITIES', row)}
          disabled={disabled}
        />
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.FINANCING_RECORDS}
          sideLabels={financingSideLabels}
          netLabel={MONTHLY_CLOSE_LABELS.NET_FINANCING_CASH_FLOW}
          rows={toTradeRows(
            [...financing.shareholderFinancing, ...financing.dividendPayout],
            'SELL',
          )}
          projectIdName={projectNameOf}
          onAdd={() => onOpenTradeDrawer('FINANCING')}
          onRowClick={(row) => onOpenTradeDrawer('FINANCING', row)}
          disabled={disabled}
        />
      </div>
    );
  }
  return (
    <CloseStageInputs
      stageId={stageId}
      yearMonth={yearMonth}
      portfolios={portfolios}
      debtAccounts={debtSectionMetas}
      portfolioCashFlows={portfolioCashFlows}
      portfolioSnapshots={portfolioSnapshots}
      repayments={repayments}
      onPortfolioCashFlowsChange={setPortfolioCashFlows}
      onRepaymentsChange={setRepayments}
      disabled={disabled}
    />
  );
};
