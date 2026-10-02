import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ReadinessVM } from '../../../mappers/closeSummary.mappers';
import { CloseReadinessCheck } from './CloseReadinessCheck';

const readinessVM: ReadinessVM = {
  isReady: false,
  checks: [
    { id: 'ACCOUNT_BALANCE', label: '帳戶餘額', passed: false, countText: '2 / 3' },
    { id: 'SECURITIES_TRADE', label: '證券買入／賣出', passed: true, countText: '6' },
    { id: 'PORTFOLIO_CASH_FLOW', label: 'Portfolio 金流', passed: false, countText: '1 / 2' },
    { id: 'PROJECT_SETTLEMENT', label: '專案結算', passed: true, countText: '4 / 4' },
    { id: 'DEBT_REPAYMENT', label: '債務還款', passed: true, countText: '2 / 2' },
  ],
  exceptions: [
    { label: '帳戶餘額', detail: '1 個帳戶尚未確認餘額', stageId: 'ACCOUNT_BALANCE' },
    {
      label: 'Portfolio 金流',
      detail: '1 個 Portfolio 尚未確認金流',
      stageId: 'PORTFOLIO_CASH_FLOW',
    },
  ],
};

const renderPanel = (props?: Partial<Parameters<typeof CloseReadinessCheck>[0]>) =>
  render(
    <CloseReadinessCheck
      readiness={readinessVM}
      onConfirm={() => {}}
      onGoToStage={() => {}}
      confirming={false}
      isConfirmable={true}
      isReadOnly={false}
      {...props}
    />,
  );

describe('CloseReadinessCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the five readiness checks with their N/M counts', () => {
    renderPanel();

    expect(screen.getAllByText('帳戶餘額').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('lists exceptions with their details', () => {
    renderPanel();

    expect(screen.getByText('1 個帳戶尚未確認餘額')).toBeInTheDocument();
    expect(screen.getByText('1 個 Portfolio 尚未確認金流')).toBeInTheDocument();
  });

  it('disables the confirm button while readiness fails', () => {
    renderPanel();

    expect(screen.getByTestId('readiness-confirm')).toBeDisabled();
  });

  it('enables the confirm button when readiness passes', () => {
    renderPanel({ readiness: { ...readinessVM, isReady: true, exceptions: [] } });

    expect(screen.getByTestId('readiness-confirm')).toBeEnabled();
  });

  it('deep links an exception to its stage', () => {
    const onGoToStage = vi.fn();
    renderPanel({ onGoToStage });

    fireEvent.click(screen.getByText('GO TO 帳戶餘額 →'));
    expect(onGoToStage).toHaveBeenCalledWith('ACCOUNT_BALANCE');
  });

  it('renders a text-only exception without a GO TO action', () => {
    renderPanel({
      readiness: {
        ...readinessVM,
        exceptions: [{ label: '交易驗證問題', detail: '餐飲：分配不存在', stageId: null }],
      },
    });

    expect(screen.getByText('餐飲：分配不存在')).toBeInTheDocument();
    expect(screen.queryByText(/GO TO/)).not.toBeInTheDocument();
  });

  it('shows zero-activity exceptions as non-blocking info rows', () => {
    renderPanel({
      readiness: {
        ...readinessVM,
        isReady: true,
        exceptions: [{ label: '零活動', detail: '台新銀行', stageId: 'COMPLETENESS_CHECK' }],
      },
    });

    expect(screen.getByText('台新銀行')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-confirm')).toBeEnabled();
  });

  it('renders readiness only — no financial figures', () => {
    // COMPLETENESS_CHECK surfaces readiness state, not report numbers; the aggregated
    // figures belong to Steps 8-9 (see docs/monthly-close.md §3).
    const { container } = renderPanel();

    expect(container).not.toHaveTextContent(/NT\$/);
    expect(container.querySelectorAll('[data-testid^="close-"]')).toHaveLength(1);
  });
});
