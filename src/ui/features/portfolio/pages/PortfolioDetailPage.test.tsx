import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type MonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import { usePortfolioDetailPage } from '@/ui/features/portfolio/hooks/usePortfolioDetailPage';
import { type PortfolioDetailVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';

import PortfolioDetailPage from './PortfolioDetailPage';

vi.mock('@/ui/features/portfolio/hooks/usePortfolioDetailPage');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseDetail = vi.mocked(usePortfolioDetailPage);
const mockUseNavigate = vi.mocked(useNavigate);

const emptyTrend: MonthTrendSeries = { values: [], labels: [], points: [], hasData: false };

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
  trend: { ...emptyTrend, hasData: false },
  performanceRows: [],
  ...overrides,
});

const makeController = (overrides: Partial<ReturnType<typeof usePortfolioDetailPage>> = {}) => ({
  vm: makeVm(),
  loading: false,
  error: null,
  reload: vi.fn(),
  handleRename: vi.fn(),
  handleActivate: vi.fn(),
  handleDeactivate: vi.fn(),
  handleDelete: vi.fn(),
  ...overrides,
});

const setup = (controller = makeController()) => {
  mockUseDetail.mockReturnValue(controller as never);
  mockUseNavigate.mockReturnValue(vi.fn());
  return render(
    <MemoryRouter>
      <PortfolioDetailPage />
    </MemoryRouter>,
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('PortfolioDetailPage', () => {
  it('renders a loading status while the controller loads', () => {
    setup(makeController({ vm: null, loading: true }));
    expect(screen.getByText('載入投資組合中')).toBeInTheDocument();
  });

  it('renders the not-found empty state when there is no portfolio', () => {
    setup(makeController({ vm: null }));
    expect(screen.getByText('找不到投資組合')).toBeInTheDocument();
  });

  it('renders the shared load-error copy with a retry when the load fails', () => {
    const reload = vi.fn();
    setup(makeController({ vm: null, error: '無法載入投資組合。', reload }));

    expect(screen.getByText('無法載入投資組合。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('renders the shared PageHeader with title, crumb and description', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Main Portfolio' })).toBeInTheDocument();
    expect(screen.getByText('PORTFOLIOS')).toBeInTheDocument();
    expect(screen.getByText('一個證券帳戶連結一個銀行帳戶')).toBeInTheDocument();
  });

  it('shows the deactivate action while active and calls it', () => {
    const handleDeactivate = vi.fn();
    setup(makeController({ handleDeactivate }));

    fireEvent.click(screen.getByRole('button', { name: '停用組合' }));
    expect(handleDeactivate).toHaveBeenCalledTimes(1);
  });

  it('shows the inactive badge and enable action while inactive', () => {
    const handleActivate = vi.fn();
    setup(makeController({ vm: makeVm({ isActive: false }), handleActivate }));

    expect(screen.getByText('已停用')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '啟用組合' }));
    expect(handleActivate).toHaveBeenCalledTimes(1);
  });

  it('submits the rename through the controller', async () => {
    const handleRename = vi.fn().mockResolvedValue(undefined);
    setup(makeController({ handleRename }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    const input = screen.getByLabelText('Rename');
    fireEvent.change(input, { target: { value: 'Growth Fund' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(handleRename).toHaveBeenCalledWith('Growth Fund'));
  });
});
