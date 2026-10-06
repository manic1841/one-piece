import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CloseSecuritiesTradeStage } from './CloseSecuritiesTradeStage';

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
      progressText="02 / 08"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      securities={{ buys: [], sells: [] }}
      financing={{ shareholderFinancing: [], dividendPayout: [] }}
      projects={[]}
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

  it('labels securities rows by their side and resolves project names from the project list', () => {
    renderStage({
      securities: {
        buys: [{ ...tradeInput, projectId: 'project-1' }],
        sells: [{ ...tradeInput, transactionId: 'tx-2', description: '賣出標的' }],
      },
      projects: [{ id: 'project-1', name: '房貸專案' }],
    });

    expect(screen.getAllByText('買入').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('賣出').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('房貸專案')).toBeInTheDocument();
  });

  it('labels financing rows by their side', () => {
    renderStage({
      financing: {
        shareholderFinancing: [{ ...tradeInput, description: '股東融資備註' }],
        dividendPayout: [{ ...tradeInput, transactionId: 'tx-2', description: '股利發放備註' }],
      },
    });

    expect(screen.getAllByText('股東融資備註').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('股利發放備註').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('股東融資').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('發放分紅').length).toBeGreaterThanOrEqual(2);
  });
});
