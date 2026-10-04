import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DRIFT_STATUS } from '@/domains/report/reportDrift';

import { CLOSE_ACTIVITY_STATUS, type CloseSummaryVM } from '../../../mappers/closeSummary.mappers';
import { CloseSummaryPanel } from './CloseSummaryPanel';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const summaryVM: CloseSummaryVM = {
  activity: [
    { stepText: '01 帳戶餘額', status: CLOSE_ACTIVITY_STATUS.CONFIRMED, dataText: '3 個帳戶' },
    {
      stepText: '02 證券買入／賣出',
      status: CLOSE_ACTIVITY_STATUS.CONFIRMED,
      dataText: '128 筆交易',
    },
    {
      stepText: '04 Portfolio 金流',
      status: CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED,
      dataText: null,
    },
    { stepText: '09 Close Period', status: CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED, dataText: null },
  ],
  financial: {
    totalAssets: 10_500_000,
    totalLiabilities: 6_200_000,
    equity: 4_300_000,
    netIncome: 117_000,
    netCashFlow: 179_000,
  },
  financialText: {
    totalAssets: 'NT$10,500,000',
    totalLiabilities: 'NT$6,200,000',
    equity: 'NT$4,300,000',
    netIncome: 'NT$117,000',
    netCashFlow: 'NT$179,000',
  },
  reports: [
    { title: '損益表', isGenerated: true },
    { title: '資產負債表', isGenerated: true },
    { title: '現金流量表', isGenerated: false },
  ],
  reportsGeneratedCount: 2,
};

const renderPanel = (props?: Partial<Parameters<typeof CloseSummaryPanel>[0]>) =>
  render(
    <CloseSummaryPanel
      summary={summaryVM}
      hasDrift={false}
      onReviewReports={() => {}}
      onClose={() => {}}
      confirming={false}
      isConfirmable={true}
      isReadOnly={false}
      {...props}
    />,
  );

describe('CloseSummaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
  });

  it('renders the close activity rows with their statuses', () => {
    renderPanel();

    expect(screen.getByText('01 帳戶餘額')).toBeInTheDocument();
    expect(screen.getByText('02 證券買入／賣出')).toBeInTheDocument();
    expect(screen.getByText('09 Close Period')).toBeInTheDocument();
  });

  it('shows unfinished stages as neutral placeholders without fabricated data', () => {
    renderPanel();

    const row = screen.getByText('04 Portfolio 金流').closest('li');
    expect(row).toHaveTextContent('-');
  });

  it('shows the financial result with full tabular numbers', () => {
    renderPanel();

    expect(screen.getByText('NT$10,500,000')).toBeInTheDocument();
    expect(screen.getByText('NT$6,200,000')).toBeInTheDocument();
    expect(screen.getByText('NT$4,300,000')).toBeInTheDocument();
    expect(screen.getByText('NT$117,000')).toBeInTheDocument();
    expect(screen.getByText('NT$179,000')).toBeInTheDocument();
  });

  it('shows missing reports with a placeholder instead of data', () => {
    renderPanel();

    expect(screen.getByText('損益表')).toBeInTheDocument();
    const cashFlowRow = screen.getByText('現金流量表').closest('div');
    expect(cashFlowRow?.textContent).toContain('尚未產生');
  });

  it('shows the persisted -> preview delta for a drifted figure', () => {
    renderPanel({
      summary: {
        ...summaryVM,
        financialDrift: {
          equity: { amount: 4_300_000, previousAmount: 4_200_000, status: DRIFT_STATUS.CHANGED },
        },
        financialText: {
          ...summaryVM.financialText,
          equity: 'NT$4,200,000 -> NT$4,300,000',
        },
      },
    });

    expect(screen.getByText('NT$4,200,000 -> NT$4,300,000')).toBeInTheDocument();
  });

  it('opens the close confirmation dialog on close click', async () => {
    confirmMock.mockResolvedValue(true);
    const onClose = vi.fn();

    renderPanel({ onClose });

    fireEvent.click(screen.getByTestId('close-period-confirm'));
    await vi.waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('only calls onClose after the dialog is confirmed', async () => {
    confirmMock.mockResolvedValue(false);
    const onClose = vi.fn();

    renderPanel({ onClose });

    fireEvent.click(screen.getByTestId('close-period-confirm'));
    await vi.waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables the close button while confirming', () => {
    renderPanel({ confirming: true });

    expect(screen.getByTestId('close-period-confirm')).toBeDisabled();
  });

  // #229: a failed persistence read is unknown, never 尚未產生.
  it('shows an unknown persistence state instead of 尚未產生 when the read failed', () => {
    renderPanel({
      summary: {
        ...summaryVM,
        reports: summaryVM.reports.map((report) => ({ ...report, isGenerated: null })),
        reportsGeneratedCount: 0,
      },
    });

    expect(screen.queryByText('尚未產生')).not.toBeInTheDocument();
    expect(screen.getAllByText('狀態未知')).toHaveLength(3);
  });

  // #228: CLOSE_PERIOD surfaces a report load failure instead of a silently empty summary.
  it('surfaces a report load failure', () => {
    renderPanel({ loadErrorMessage: '無法載入報表預覽，請稍後再試。' });

    expect(screen.getByRole('alert')).toHaveTextContent('無法載入報表預覽，請稍後再試。');
  });

  it('shows no alert while the report load succeeded', () => {
    renderPanel();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // #234: the backend close gate only checks that the reports are persisted, so
  // a drift appearing after FINANCIAL_REPORTS was confirmed has to be caught here.
  it('blocks the close when reports drifted', () => {
    renderPanel({ hasDrift: true });

    expect(screen.getByTestId('close-period-confirm')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('報表與已產生報表不一致');
  });

  it('does not name a drift count the screen cannot justify', () => {
    renderPanel({ hasDrift: true });

    expect(screen.getByTestId('close-drift-block')).not.toHaveTextContent('項漂移');
  });

  it('sends the user back to FINANCIAL_REPORTS from the drift block', () => {
    const onReviewReports = vi.fn();

    renderPanel({ hasDrift: true, onReviewReports });

    fireEvent.click(screen.getByTestId('review-reports'));

    expect(onReviewReports).toHaveBeenCalledTimes(1);
  });

  it('leaves the close reachable when nothing drifted', () => {
    renderPanel({ hasDrift: false });

    expect(screen.getByTestId('close-period-confirm')).toBeEnabled();
    expect(screen.queryByTestId('close-drift-block')).not.toBeInTheDocument();
  });
});
