import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type MonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import { type PortfolioDetailVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';

import PortfolioDetail from './PortfolioDetail';

const emptyTrend: MonthTrendSeries = {
  values: [],
  labels: [],
  points: [],
  hasData: false,
};

const makeVm = (overrides: Partial<PortfolioDetailVM> = {}): PortfolioDetailVM => ({
  id: 'p1',
  name: 'Main Portfolio',
  isActive: true,
  totalValueText: 'NT$2,480,000',
  asOfText: '2026-09',
  securitiesName: 'Brokerage',
  bankName: 'Investment Bank',
  monthlyReturnText: '12.42%',
  cumulativeReturnText: '12.42%',
  breakdown: {
    previousValueText: 'NT$2,220,000',
    currentValueText: 'NT$2,480,000',
    investmentCashFlowText: 'NT$0',
    calculatedReturnText: 'NT$260,000',
  },
  trend: {
    values: [2220000, 2480000],
    labels: ['AUG', 'SEP'],
    points: [
      { title: 'AUG', value: 'NT$2,220,000' },
      { title: 'SEP', value: 'NT$2,480,000' },
    ],
    hasData: true,
  },
  performanceRows: [
    {
      id: 'p1-2026-09',
      dateText: 'Sep 2026',
      totalValueText: 'NT$2,480,000',
      returnText: '12.42%',
      cumulativeText: '12.42%',
      netFlowText: 'NT$0',
    },
  ],
  allocation: {
    hasData: false,
    marketSegments: [],
    exposureSegments: [],
    marketTotalText: '—',
    exposureTotalText: '—',
  },
  ...overrides,
});

describe('PortfolioDetail surfaces', () => {
  it('renders every data section from the VM without a snapshot entry', () => {
    render(<PortfolioDetail vm={makeVm()} onDelete={vi.fn()} />);

    expect(screen.getByText('PORTFOLIO VALUE')).toBeInTheDocument();
    expect(screen.getByText('VALUE BREAKDOWN')).toBeInTheDocument();
    expect(screen.getByText('RETURN')).toBeInTheDocument();
    expect(screen.getByText('RETURN CALCULATION')).toBeInTheDocument();
    expect(screen.getByText('12M PORTFOLIO VALUE')).toBeInTheDocument();
    expect(screen.getByText('MONTHLY PERFORMANCE')).toBeInTheDocument();
    expect(screen.getByText('DANGER ZONE')).toBeInTheDocument();

    expect(screen.getAllByText('NT$2,480,000').length).toBeGreaterThan(0);
    expect(screen.queryByText(/關帳快照/)).not.toBeInTheDocument();
  });

  it('no longer shows the non-investment cash flow row', () => {
    render(<PortfolioDetail vm={makeVm()} onDelete={vi.fn()} />);
    expect(screen.queryByText('Non-investment Cash Flow')).not.toBeInTheDocument();
  });

  it('falls back to an empty-state line when there is no snapshot', () => {
    render(
      <PortfolioDetail
        vm={makeVm({ trend: emptyTrend, performanceRows: [] })}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('尚無快照資料')).toBeInTheDocument();
  });

  it('uses the holdings empty copy (not the snapshot one) when a snapshot has no holdings', () => {
    render(<PortfolioDetail vm={makeVm()} onDelete={vi.fn()} />);

    expect(screen.getByText('此組合尚無持倉資料')).toBeInTheDocument();
    expect(screen.queryByText('尚無快照資料')).not.toBeInTheDocument();
  });

  it('invokes the delete handler from the danger zone', () => {
    const onDelete = vi.fn();
    render(<PortfolioDetail vm={makeVm()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: '刪除投資組合' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
