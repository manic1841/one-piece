import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CashFlowStatementPage from './CashFlowStatement';

vi.mock('@/ui/features/report/hooks/useCashFlow', () => ({
  useCashFlow: vi.fn(),
}));

vi.mock('@/ui/features/report/components/ReportHeader', () => ({
  ReportHeader: () => <div data-testid="report-header" />,
}));

describe('CashFlowStatementPage', () => {
  it('renders summary and reconciliation warning', async () => {
    const { useCashFlow } = await import('@/ui/features/report/hooks/useCashFlow');

    vi.mocked(useCashFlow).mockReturnValue({
      data: {
        yearMonth: '2026-03',
        operating: {
          label: '營業活動',
          total: 200,
          totalText: 'NT$200',
          inflowItems: [
            { code: 'income:salary', label: '薪資', amount: 500, amountText: 'NT$500' },
          ],
          outflowItems: [
            { code: 'expense:food', label: '餐飲', amount: 300, amountText: 'NT$300' },
          ],
        },
        investing: {
          label: '投資活動',
          total: -100,
          totalText: '-NT$100',
          inflowItems: [],
          outflowItems: [{ code: 'asset:buy', label: '買進', amount: 100, amountText: 'NT$100' }],
        },
        financing: {
          label: '融資活動',
          total: 0,
          totalText: 'NT$0',
          inflowItems: [],
          outflowItems: [],
        },
        netCashChange: 100,
        netCashChangeText: 'NT$100',
        beginningBalance: 1000,
        beginningBalanceText: 'NT$1,000',
        endingBalance: 1100,
        endingBalanceText: 'NT$1,100',
        actualBalance: 900,
        actualBalanceText: 'NT$900',
        adjustment: -200,
        adjustmentText: '-NT$200',
      },
      loading: false,
      error: null,
      currentDate: new Date('2026-03-01'),
      setCurrentDate: vi.fn(),
      nextMonth: vi.fn(),
      prevMonth: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <CashFlowStatementPage
        householdId="h1"
        currentDate={new Date('2026-03-01')}
        onDateChange={vi.fn()}
        onViewChange={vi.fn()}
        onBack={vi.fn()}
        reportMode="MONTHLY"
        onReportModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('淨現金變動')).toBeInTheDocument();
    expect(screen.getByText('NT$1,000')).toBeInTheDocument();
    expect(screen.getByText(/對帳差異提醒：期末現金/)).toBeInTheDocument();
    expect(screen.getByText('+NT$500')).toBeInTheDocument();
    expect(screen.getByText('-NT$300')).toBeInTheDocument();
  });
});
