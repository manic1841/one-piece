import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type RetirementProjectionYearDetailVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';

import { YearBreakdown } from './YearBreakdown';

const row = (
  overrides: Partial<RetirementProjectionYearDetailVM> = {},
): RetirementProjectionYearDetailVM => ({
  year: 2030,
  age: 40,
  isRetired: false,
  statusText: '工作中',
  incomeText: 'NT$100,000',
  expenseText: 'NT$60,000',
  investmentReturnText: 'NT$1,000',
  inflowItems: [
    {
      sourceRef: 'salary',
      label: '薪資',
      amount: 80_000,
      amountText: 'NT$80,000',
      originText: '規則',
    },
    {
      sourceRef: 'bonus',
      label: '獎金',
      amount: 20_000,
      amountText: 'NT$20,000',
      originText: '生活事件',
    },
  ],
  outflowItems: [
    {
      sourceRef: 'rent',
      label: '房租',
      amount: 60_000,
      amountText: 'NT$60,000',
      originText: '規則',
    },
  ],
  netCashFlow: 41_000,
  netCashFlowText: 'NT$41,000',
  opening: 500_000,
  openingText: 'NT$500,000',
  savingsText: 'NT$541,000',
  ...overrides,
});

describe('YearBreakdown', () => {
  it('lists each line with its origin and the group subtotals', () => {
    render(<YearBreakdown row={row()} scope="desktop" />);

    const breakdown = screen.getByTestId('year-breakdown-desktop-2030');
    expect(within(breakdown).getByText('薪資')).toBeInTheDocument();
    expect(within(breakdown).getByText('生活事件')).toBeInTheDocument();
    expect(within(breakdown).getByText('收入明細')).toBeInTheDocument();
    expect(within(breakdown).getByText('支出明細')).toBeInTheDocument();
  });

  it('keeps an empty group visible instead of dropping it', () => {
    render(<YearBreakdown row={row({ inflowItems: [], incomeText: 'NT$0' })} scope="desktop" />);

    expect(screen.getByText('無收入項目')).toBeInTheDocument();
    expect(screen.getByText('房租')).toBeInTheDocument();
  });

  it('names each group for assistive tech', () => {
    render(<YearBreakdown row={row()} scope="desktop" />);

    expect(screen.getByRole('region', { name: '收入明細' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '支出明細' })).toBeInTheDocument();
  });

  it('gives the two instances of the same year distinct ids', () => {
    render(
      <>
        <YearBreakdown row={row()} scope="desktop" />
        <YearBreakdown row={row()} scope="panel" />
      </>,
    );

    expect(screen.getByTestId('year-breakdown-desktop-2030')).toBeInTheDocument();
    expect(screen.getByTestId('year-breakdown-panel-2030')).toBeInTheDocument();
    for (const heading of screen.getAllByText('收入明細')) {
      expect(document.getElementById(heading.id)).toBe(heading);
    }
  });
});
