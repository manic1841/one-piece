import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CloseSecuritiesTradeStage } from './CloseSecuritiesTradeStage';

const noEvidence = {
  kind: 'NONE' as const,
  transactionIssues: [],
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted: null,
  projectSettlements: [],
};

const tradeInput = {
  transactionId: 'tx-1',
  amount: 1200,
  date: new Date('2026-08-05'),
  description: '買入標的',
  projectId: null,
};

const renderStage = (props?: Partial<Parameters<typeof CloseSecuritiesTradeStage>[0]>) =>
  render(
    <CloseSecuritiesTradeStage
      stepText="證券買入／賣出"
      progressText="03 / 09"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      evidence={noEvidence}
      securities={{ buys: [], sells: [] }}
      financing={{ shareholderFinancing: [], dividendPayout: [] }}
      portfolios={[]}
      onOpenTradeDrawer={() => {}}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('CloseSecuritiesTradeStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('證券買入／賣出')).toBeInTheDocument();
  });

  it('renders the securities and financing trade tables', () => {
    renderStage();

    expect(screen.getByText('證券交易紀錄')).toBeInTheDocument();
    expect(screen.getByText('融資紀錄')).toBeInTheDocument();
  });

  it('opens the securities drawer from the add button and row click', () => {
    const onOpenTradeDrawer = vi.fn();
    renderStage({
      securities: { buys: [tradeInput], sells: [] },
      onOpenTradeDrawer,
    });

    fireEvent.click(screen.getAllByRole('button', { name: '新增交易' })[0]);
    expect(onOpenTradeDrawer).toHaveBeenCalledWith('SECURITIES');

    fireEvent.click(screen.getAllByText('買入標的')[0]);
    expect(onOpenTradeDrawer).toHaveBeenCalledWith(
      'SECURITIES',
      expect.objectContaining({ transactionId: 'tx-1' }),
    );
  });

  it('hides the add entry and confirm bar in a read-only period', () => {
    const onOpenTradeDrawer = vi.fn();
    renderStage({
      securities: { buys: [tradeInput], sells: [] },
      onOpenTradeDrawer,
      isReadOnly: true,
    });

    expect(screen.queryByRole('button', { name: '新增交易' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CONTINUE →' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText('買入標的')[0]);
    expect(onOpenTradeDrawer).not.toHaveBeenCalled();
  });
});
