import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClosePortfolioCashFlowStage } from './ClosePortfolioCashFlowStage';

const noEvidence = {
  kind: 'NONE' as const,
  transactionIssues: [],
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted: null,
  projectSettlements: [],
};

const renderStage = (props?: Partial<Parameters<typeof ClosePortfolioCashFlowStage>[0]>) =>
  render(
    <ClosePortfolioCashFlowStage
      stepText="Portfolio 金流"
      progressText="04 / 09"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      evidence={noEvidence}
      portfolios={[]}
      portfolioSnapshots={new Map()}
      cashFlows={{}}
      setCashFlows={() => undefined}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('ClosePortfolioCashFlowStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('Portfolio 金流')).toBeInTheDocument();
  });

  it('renders an empty state when no portfolios exist', () => {
    renderStage();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('renders per-portfolio sections with their deposits and withdrawals inputs', () => {
    renderStage({ portfolios: [{ id: 'p-1', name: '長期持倉' }] });

    expect(screen.getAllByText('長期持倉').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/CASH IN 長期持倉/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/CASH OUT 長期持倉/).length).toBeGreaterThanOrEqual(1);
  });

  it('routes input edits through setCashFlows', () => {
    const setCashFlows = vi.fn();
    renderStage({ portfolios: [{ id: 'p-1', name: '長期持倉' }], setCashFlows });

    fireEvent.change(screen.getAllByLabelText(/CASH IN 長期持倉/)[0], {
      target: { value: '500' },
    });
    expect(setCashFlows).toHaveBeenCalled();
  });

  it('disables cash-flow inputs and hides the confirm bar in a read-only period', () => {
    renderStage({
      portfolios: [{ id: 'p-1', name: '長期持倉' }],
      cashFlows: { 'p-1': { deposits: 500, withdrawals: 100 } },
      isReadOnly: true,
    });

    expect(screen.getAllByLabelText(/CASH IN 長期持倉/)[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'CONTINUE →' })).not.toBeInTheDocument();
  });
});
