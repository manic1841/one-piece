import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CloseAccountBalanceStage } from './CloseAccountBalanceStage';

const noEvidence = {
  kind: 'NONE' as const,
  transactionIssues: [],
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted: null,
  projectSettlements: [],
};

const renderStage = (props?: Partial<Parameters<typeof CloseAccountBalanceStage>[0]>) =>
  render(
    <CloseAccountBalanceStage
      stepText="帳戶餘額"
      progressText="01 / 09"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      evidence={noEvidence}
      accounts={[]}
      accountSnapshots={new Map()}
      balances={[]}
      setBalances={() => undefined}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('CloseAccountBalanceStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('帳戶餘額')).toBeInTheDocument();
    expect(screen.getByText('01 / 09')).toBeInTheDocument();
  });

  it('renders an empty input state when no accounts exist', () => {
    renderStage();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });
});
