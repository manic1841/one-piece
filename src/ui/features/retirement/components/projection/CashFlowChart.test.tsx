import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type RetirementProjectionPointVM,
  type RetirementProjectionVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { CashFlowChart } from './CashFlowChart';

/** y of an area path's closing baseline edge (the last coordinate pair before `Z`). */
const areaBaselineYOf = (areaPath: string): number => {
  const coords = areaPath.replace(/ Z$/, '').split(/[ML]/).slice(1);
  return Number(coords[coords.length - 1].trim().split(' ')[1]);
};

/** y of a path's first coordinate pair. */
const lineYOf = (path: string): number => Number(path.split(' ')[1]);

function pointFixture(
  overrides: Partial<RetirementProjectionPointVM> = {},
): RetirementProjectionPointVM {
  return {
    year: 2046,
    age: 61,
    income: 120_000,
    expense: 60_000,
    investmentIncome: 25_000,
    netCashFlow: 85_000,
    savings: 1_000_000,
    incomeText: 'NT$120,000',
    expenseText: 'NT$60,000',
    investmentIncomeText: 'NT$25,000',
    netCashFlowText: 'NT$85,000',
    savingsText: 'NT$1,000,000',
    isBankruptYear: false,
    isRetired: true,
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
    chartData: [
      pointFixture({ year: 2045 }),
      pointFixture({ year: 2046, investmentIncome: 30_000 }),
    ],
    yearlyDetails: [],
    expenseBreakdownChartData: null,
    risks: [],
  };
}

describe('CashFlowChart', () => {
  it('legends every band and the two lines', () => {
    render(<CashFlowChart projection={projectionFixture()} />);

    for (const label of ['Income', 'Investment Return', 'Expense', 'Net Cash Flow', 'Net Worth']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it('fills income, stacked investment return and expense as three gradient bands', () => {
    const { container } = render(<CashFlowChart projection={projectionFixture()} />);

    const gradientPaths = [...container.querySelectorAll('path')].filter((path) =>
      path.getAttribute('fill')?.startsWith('url(#'),
    );
    expect(gradientPaths).toHaveLength(3);
    // The stacked band is tinted with the investment tone, not the income tone.
    const stopColors = [...container.querySelectorAll('linearGradient')].map((gradient) =>
      gradient.querySelector('stop')?.getAttribute('stop-color'),
    );
    expect(stopColors).toEqual([
      'hsl(var(--positive))',
      'hsl(var(--warning))',
      'hsl(var(--negative))',
    ]);
  });

  it('plots the investment band from the income line upward, not from zero', () => {
    const { container } = render(<CashFlowChart projection={projectionFixture()} />);

    const [income, stacked] = [...container.querySelectorAll('path')].filter((path) =>
      path.getAttribute('fill')?.startsWith('url(#'),
    );
    // The stacked band closes on the income line's y, above the income band's zero baseline.
    expect(areaBaselineYOf(stacked.getAttribute('d')!)).toBeCloseTo(
      lineYOf(income.getAttribute('d')!),
    );
    expect(areaBaselineYOf(income.getAttribute('d')!)).toBeGreaterThan(
      areaBaselineYOf(stacked.getAttribute('d')!),
    );
  });
});
