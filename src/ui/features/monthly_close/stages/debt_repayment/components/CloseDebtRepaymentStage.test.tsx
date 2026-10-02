import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CloseDebtRepaymentStage } from './CloseDebtRepaymentStage';

const renderStage = (props?: Partial<Parameters<typeof CloseDebtRepaymentStage>[0]>) =>
  render(
    <CloseDebtRepaymentStage
      stepText="債務還款"
      progressText="05 / 08"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      debtAccounts={[]}
      yearMonth="2026-08"
      repayments={[]}
      setRepayments={() => undefined}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('CloseDebtRepaymentStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('債務還款')).toBeInTheDocument();
  });

  it('renders an empty state when no debt accounts exist', () => {
    renderStage();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a payment input per debt account with its section fields', () => {
    renderStage({
      debtAccounts: [
        {
          debtAccountId: 'debt-1',
          debtAccountName: '房貸',
          interestRate: 2.1,
          openingBalance: 1_000_000,
          monthlyDue: 12_000,
        },
      ],
    });

    expect(screen.getByText('房貸')).toBeInTheDocument();
    expect(screen.getByLabelText(/總繳款 房貸/)).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
  });

  it('hides the confirm bar in a read-only period', () => {
    renderStage({ isReadOnly: true });

    expect(screen.queryByRole('button', { name: 'CONTINUE →' })).not.toBeInTheDocument();
  });
});
