import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { CloseProjectSettlementStage } from './CloseProjectSettlementStage';

const rows = [
  {
    projectId: 'p-1',
    projectName: '裝修',
    settled: true,
    openingBalance: 1000,
    income: 5000,
    expense: 3000,
    closingBalance: 2000,
  },
  {
    projectId: 'p-2',
    projectName: '旅遊',
    settled: false,
    openingBalance: 0,
    income: 0,
    expense: 0,
    closingBalance: 0,
  },
];

const renderStage = (props?: Partial<Parameters<typeof CloseProjectSettlementStage>[0]>) =>
  render(
    <CloseProjectSettlementStage
      stepText="專案結算"
      progressText="04 / 08"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      settlements={rows}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('CloseProjectSettlementStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('專案結算')).toBeInTheDocument();
  });

  it('renders every project with its four formatted amounts', () => {
    renderStage();

    // Desktop table and mobile list both render; neither is hidden in jsdom.
    expect(screen.getAllByText('裝修').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('旅遊').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NT$1,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NT$5,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('NT$3,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NT$2,000').length).toBeGreaterThanOrEqual(1);
  });

  it('marks only the unsettled projects', () => {
    renderStage();

    expect(screen.getAllByText(MONTHLY_CLOSE_LABELS.UNSETTLED).length).toBe(2);
  });

  it('renders an empty state when there are no projects', () => {
    renderStage({ settlements: [] });

    expect(screen.getByText(MONTHLY_CLOSE_LABELS.NO_PROJECTS)).toBeInTheDocument();
    expect(screen.queryByText(MONTHLY_CLOSE_LABELS.CLOSING_BALANCE)).not.toBeInTheDocument();
  });

  it('surfaces the load failure instead of an apparently clean stage', () => {
    renderStage({ settlements: [], loadErrorMessage: '無法載入專案結算狀態，請稍後再試。' });

    expect(screen.getByRole('alert')).toHaveTextContent('無法載入專案結算狀態，請稍後再試。');
  });

  it('routes the confirm action through onConfirm', () => {
    const onConfirm = vi.fn();
    renderStage({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: MONTHLY_CLOSE_LABELS.CONTINUE }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('hides the confirm bar in a read-only period', () => {
    renderStage({ isReadOnly: true });

    expect(
      screen.queryByRole('button', { name: MONTHLY_CLOSE_LABELS.CONTINUE }),
    ).not.toBeInTheDocument();
  });
});
