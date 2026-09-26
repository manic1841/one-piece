import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CLOSE_ACTIVITY_STATUS, type CloseSummaryVM } from '../mappers/closeSummary.mappers';
import { CloseSummaryPanel } from './CloseSummaryPanel';

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const confirmMock = vi.fn();

const summaryVM: CloseSummaryVM = {
  activity: [
    { stepText: '01 帳戶餘額', status: CLOSE_ACTIVITY_STATUS.CONFIRMED, dataText: '3 個帳戶' },
    { stepText: '02 交易驗證', status: CLOSE_ACTIVITY_STATUS.CONFIRMED, dataText: '128 筆交易' },
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
  reports: [
    { title: '損益表', isGenerated: true },
    { title: '資產負債表', isGenerated: true },
    { title: '現金流量表', isGenerated: false },
  ],
  reportsGeneratedCount: 2,
};

const renderPanel = (props?: Partial<Parameters<typeof CloseSummaryPanel>[0]>) =>
  render(
    <CloseSummaryPanel summary={summaryVM} onClose={() => {}} confirming={false} {...props} />,
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
    expect(screen.getByText('02 交易驗證')).toBeInTheDocument();
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
});
