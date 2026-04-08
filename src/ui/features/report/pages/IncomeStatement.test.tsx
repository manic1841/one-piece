import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import IncomeStatementPage from './IncomeStatement';

vi.mock('@/ui/features/report/hooks/useIncomeStatement', () => ({
  useIncomeStatement: vi.fn(),
}));

vi.mock('@/ui/features/report/components/ReportHeader', () => ({
  ReportHeader: () => <div data-testid="report-header" />,
}));

describe('IncomeStatementPage', () => {
  it('renders summary and expands sub items', async () => {
    const { useIncomeStatement } = await import('@/ui/features/report/hooks/useIncomeStatement');

    vi.mocked(useIncomeStatement).mockReturnValue({
      data: {
        yearMonth: '2026-03',
        incomeTotal: 1000,
        incomeTotalText: '$1,000',
        expenseTotal: 400,
        expenseTotalText: '$400',
        netIncome: 600,
        netIncomeText: '$600',
        incomeItems: [
          {
            code: 'income:salary',
            label: '薪資',
            amount: 1000,
            amountText: '$1,000',
            subItems: [
              {
                code: 'income:salary:base',
                label: '本薪',
                amount: 900,
                amountText: '$900',
              },
            ],
          },
        ],
        expenseItems: [
          {
            code: 'expense:food',
            label: '餐飲',
            amount: 400,
            amountText: '$400',
          },
        ],
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
      <IncomeStatementPage
        householdId="h1"
        currentDate={new Date('2026-03-01')}
        onDateChange={vi.fn()}
        onViewChange={vi.fn()}
        onBack={vi.fn()}
        reportMode="MONTHLY"
        onReportModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('收入合計')).toBeInTheDocument();
    expect(screen.getAllByText('$1,000').length).toBeGreaterThan(0);
    expect(screen.queryByText('本薪')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('薪資'));

    expect(screen.getByText('本薪')).toBeInTheDocument();
    expect(screen.getByText('$900')).toBeInTheDocument();
  });
});
