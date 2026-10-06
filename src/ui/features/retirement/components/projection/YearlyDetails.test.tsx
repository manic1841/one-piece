import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type RetirementProjectionVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { YearlyDetails } from './YearlyDetails';

function yearDetailFixture(
  overrides: Partial<RetirementProjectionYearDetailVM> = {},
): RetirementProjectionYearDetailVM {
  return {
    year: 2046,
    age: 61,
    isRetired: true,
    statusText: '退休後',
    incomeText: 'NT$120,000',
    expenseText: 'NT$60,000',
    investmentReturnText: 'NT$25,000',
    netCashFlowText: 'NT$85,000',
    savingsText: 'NT$1,000,000',
    incomeItems: [{ name: '薪資', amountText: 'NT$145,000' }],
    expenseItems: [{ name: '生活支出', amountText: 'NT$77,000' }],
    ...overrides,
  };
}

function projectionFixture(): RetirementProjectionVM {
  return {
    retirementYear: 2045,
    retirementSavingsText: 'NT$1,000,000',
    minYearText: '2026',
    minSavingsText: 'NT$100,000',
    bankruptText: '否',
    bankruptTone: 'positive',
    chartData: [],
    yearlyDetails: [yearDetailFixture()],
    expenseBreakdownChartData: null,
    risks: [],
  };
}

function openYearlyDetails() {
  fireEvent.click(screen.getByRole('button', { name: /每年明細/ }));
}

describe('YearlyDetails', () => {
  it('shows compact mobile rows with Year and Net Worth visible and remaining fields collapsed', () => {
    render(<YearlyDetails projection={projectionFixture()} />);

    expect(screen.queryByTestId('yearly-row-mobile-2046')).not.toBeInTheDocument();

    openYearlyDetails();

    const mobileRow = screen.getByTestId('yearly-row-mobile-2046');
    expect(within(mobileRow).getByText('2046')).toBeInTheDocument();
    expect(within(mobileRow).getByText('NT$1,000,000')).toBeInTheDocument();
    expect(within(mobileRow).queryByText('投資收益')).not.toBeInTheDocument();
  });

  it('reveals the remaining fields in desktop reading order when the mobile row is expanded', () => {
    render(<YearlyDetails projection={projectionFixture()} />);
    openYearlyDetails();

    const mobileRow = screen.getByTestId('yearly-row-mobile-2046');
    fireEvent.click(mobileRow);

    const scoped = within(mobileRow);
    const fieldLabels = ['Age', 'Status', 'Income', 'Expense', '投資收益', 'Net'].map((text) =>
      scoped.getByText(text),
    );
    const fieldsInOrder = fieldLabels.every((label, index) =>
      index === 0
        ? true
        : Boolean(
            fieldLabels[index - 1].compareDocumentPosition(label) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
    );
    expect(fieldsInOrder).toBe(true);

    expect(scoped.getByText('退休後')).toBeInTheDocument();
    expect(scoped.getByText('收入明細')).toBeInTheDocument();
    expect(scoped.getByText('薪資')).toBeInTheDocument();
    expect(scoped.getByText('支出明細')).toBeInTheDocument();
    expect(scoped.getByText('生活支出')).toBeInTheDocument();

    const incomeHeading = scoped.getByText('收入明細');
    const expenseHeading = scoped.getByText('支出明細');
    expect(
      Boolean(
        incomeHeading.compareDocumentPosition(expenseHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('keeps the desktop table layout on the shared data-table', () => {
    render(<YearlyDetails projection={projectionFixture()} />);
    openYearlyDetails();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Net Worth' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '投資收益' })).toBeInTheDocument();
    expect(within(table).getByText('2046')).toBeInTheDocument();
  });

  it('expands a desktop row to its breakdown when clicked', () => {
    render(<YearlyDetails projection={projectionFixture()} />);
    openYearlyDetails();

    const row = screen.getByTestId('yearly-row-2046');
    expect(screen.queryByTestId('yearly-detail-2046')).not.toBeInTheDocument();

    fireEvent.click(row);
    const detail = screen.getByTestId('yearly-detail-2046');
    expect(within(detail).getByText('收入明細')).toBeInTheDocument();
    expect(within(detail).getByText('支出明細')).toBeInTheDocument();
  });

  it('keeps the retired warning tone on hover and uses the generic hover only for working years', () => {
    const projection = projectionFixture();
    projection.yearlyDetails = [
      yearDetailFixture({ year: 2030, isRetired: false, statusText: '累積期' }),
      yearDetailFixture(),
    ];
    render(<YearlyDetails projection={projection} />);
    openYearlyDetails();

    const retiredRow = screen.getByTestId('yearly-row-2046');
    expect(retiredRow.className).toContain('bg-warning/5');
    expect(retiredRow.className).toContain('hover:bg-warning/10');
    expect(retiredRow.className).not.toContain('hover:bg-muted/50');

    const workingRow = screen.getByTestId('yearly-row-2030');
    expect(workingRow.className).toContain('hover:bg-muted/50');
  });

  it('keeps the retired warning tone while the row is expanded', () => {
    render(<YearlyDetails projection={projectionFixture()} />);
    openYearlyDetails();

    const retiredRow = screen.getByTestId('yearly-row-2046');
    fireEvent.click(retiredRow);

    expect(screen.getByTestId('yearly-detail-2046')).toBeInTheDocument();
    expect(retiredRow.className).toContain('bg-warning/10');
    expect(retiredRow.className).not.toContain('bg-muted/50');
  });
});
