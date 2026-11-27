import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';

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

  it('explains an empty step inline instead of gating the confirm', () => {
    renderStage();

    expect(screen.getByText(/確認後仍會完成這個步驟/)).toBeInTheDocument();
  });

  it('drops the empty note once any row exists', () => {
    renderStage({ securities: { buys: [tradeInput], sells: [] } });

    expect(screen.queryByText(/確認後仍會完成這個步驟/)).not.toBeInTheDocument();
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

  it('tones the securities summary by cash direction: buys out, sells in', () => {
    renderStage({
      securities: {
        buys: [{ ...tradeInput, amount: 1000 }],
        sells: [{ ...tradeInput, transactionId: 'tx-2', amount: 300 }],
      },
    });

    expect(screen.getByTestId('securities-summary-outflow')).toHaveClass(MONEY_TONE_CLASS.negative);
    expect(screen.getByTestId('securities-summary-inflow')).toHaveClass(MONEY_TONE_CLASS.positive);
    const net = screen.getByTestId('securities-summary-net');
    expect(net).toHaveTextContent('-NT$700');
    expect(net).toHaveClass(MONEY_TONE_CLASS.negative);
  });

  it('tones the financing summary by cash direction: financing in, dividends out', () => {
    renderStage({
      financing: {
        shareholderFinancing: [{ ...tradeInput, amount: 300 }],
        dividendPayout: [{ ...tradeInput, transactionId: 'tx-2', amount: 1000 }],
      },
    });

    expect(screen.getByTestId('financing-summary-inflow')).toHaveClass(MONEY_TONE_CLASS.positive);
    expect(screen.getByTestId('financing-summary-outflow')).toHaveClass(MONEY_TONE_CLASS.negative);
    const net = screen.getByTestId('financing-summary-net');
    expect(net).toHaveTextContent('-NT$700');
    expect(net).toHaveClass(MONEY_TONE_CLASS.negative);
  });

  it('leaves a balanced net without a direction tone', () => {
    renderStage({
      securities: {
        buys: [{ ...tradeInput, amount: 500 }],
        sells: [{ ...tradeInput, transactionId: 'tx-2', amount: 500 }],
      },
    });

    const net = screen.getByTestId('securities-summary-net');
    expect(net).toHaveTextContent('NT$0');
    expect(net).toHaveClass(MONEY_TONE_CLASS.zero);
  });

  it('leaves an empty side without a direction tone', () => {
    renderStage({ securities: { buys: [{ ...tradeInput, amount: 500 }], sells: [] } });

    // Zero is the absence of a direction, so an empty side is not painted green.
    const inflow = screen.getByTestId('securities-summary-inflow');
    expect(inflow).toHaveTextContent('NT$0');
    expect(inflow).toHaveClass(MONEY_TONE_CLASS.zero);
  });
});
