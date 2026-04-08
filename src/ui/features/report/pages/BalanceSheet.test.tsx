import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BalanceSheetPage from './BalanceSheet';

vi.mock('@/ui/features/report/hooks/useBalanceSheet', () => ({
  useBalanceSheet: vi.fn(),
}));

vi.mock('@/ui/features/report/components/ReportHeader', () => ({
  ReportHeader: () => <div data-testid="report-header" />,
}));

describe('BalanceSheetPage', () => {
  it('renders totals and shows adjustment warning when threshold exceeded', async () => {
    const { useBalanceSheet } = await import('@/ui/features/report/hooks/useBalanceSheet');

    vi.mocked(useBalanceSheet).mockReturnValue({
      data: {
        yearMonth: '2026-03',
        assets: {
          total: 10000,
          totalText: '$10,000',
          groups: {
            cash: {
              label: '現金',
              total: 10000,
              totalText: '$10,000',
              items: [
                { code: 'asset:cash', label: '現金帳戶', amount: 10000, amountText: '$10,000' },
              ],
            },
          },
        },
        liabilities: {
          total: 2000,
          totalText: '$2,000',
          groups: {
            debt: {
              label: '負債',
              total: 2000,
              totalText: '$2,000',
              items: [
                { code: 'liability:loan', label: '貸款', amount: 2000, amountText: '$2,000' },
              ],
            },
          },
        },
        equity: {
          total: 8000,
          totalText: '$8,000',
          groups: {
            retained: {
              label: '保留盈餘',
              total: 6500,
              totalText: '$6,500',
              items: [
                { code: 'equity:retained', label: '保留盈餘', amount: 6500, amountText: '$6,500' },
              ],
            },
            adjustment: {
              label: '調整項目',
              total: 1500,
              totalText: '$1,500',
              items: [
                { code: 'equity:adjustment', label: '調整', amount: 1500, amountText: '$1,500' },
              ],
            },
          },
        },
      },
      loading: false,
      error: null,
      currentDate: new Date('2026-03-01'),
      setCurrentDate: vi.fn(),
      nextMonth: vi.fn(),
      prevMonth: vi.fn(),
      reload: vi.fn(),
    });

    render(
      <BalanceSheetPage
        householdId="h1"
        currentDate={new Date('2026-03-01')}
        onDateChange={vi.fn()}
        onViewChange={vi.fn()}
        onBack={vi.fn()}
        reportMode="MONTHLY"
        onReportModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('資產合計')).toBeInTheDocument();
    expect(screen.getAllByText('$10,000').length).toBeGreaterThan(0);
    expect(
      screen.getByText('調整項目偏大，請確認是否有漏記交易，或帳戶結算金額是否正確。'),
    ).toBeInTheDocument();
  });
});
