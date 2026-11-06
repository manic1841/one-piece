import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REPORT_ANALYSIS_LABELS,
  REPORT_LIST_LABELS,
} from '@/ui/constants/report/reportCenterLabels';

import ReportListPage from './ReportListPage';

const mocks = vi.hoisted(() => ({
  listReportsExecute: vi.fn(),
  listPeriodsExecute: vi.fn(),
}));

vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: { execute: mocks.listReportsExecute },
}));

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  ListFinancialPeriodsUseCase: class {
    execute = mocks.listPeriodsExecute;
  },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'h1' } }),
}));

const mockAnalysis = vi.hoisted(() => vi.fn());
vi.mock('@/application/report/use_cases/getFinancialAnalysisWorkflow', () => ({
  getFinancialAnalysisWorkflow: { execute: mockAnalysis },
}));

const analysisResult = (overrides: Record<string, unknown> = {}) => ({
  anchor: { yearMonth: '2026-06', closed: true },
  kpis: {
    yearMonth: '2026-06',
    assets: 600000,
    netWorth: 450000,
    liabilities: 150000,
    savingsRate: 12.5,
    anchorClosed: true,
  },
  unclosedMonths: [],
  range: '3y',
  availableRanges: ['1y'],
  netWorthPoints: [],
  assetCompositionPoints: [],
  investmentPerformancePoints: [],
  incomePoints: [],
  cashFlowPoints: [],
  debtLeveragePoints: [],
  cashCoveragePoints: [],
  ...overrides,
});

const incomeReport = (yearMonth: string, netIncome: number) => ({
  id: `${yearMonth}-INCOME_STATEMENT`,
  householdId: 'h1',
  yearMonth,
  type: 'INCOME_STATEMENT' as const,
  data: {
    yearMonth,
    incomeTotal: netIncome,
    expenseTotal: 0,
    netIncome,
    incomeItems: [],
    expenseItems: [],
  },
});
const balanceReport = (yearMonth: string, equity: number) => ({
  id: `${yearMonth}-BALANCE_SHEET`,
  householdId: 'h1',
  yearMonth,
  type: 'BALANCE_SHEET' as const,
  data: {
    yearMonth,
    assets: { total: equity, groups: {} },
    liabilities: { total: 0, groups: {} },
    equity: { total: equity, groups: {} },
  },
});
const cashReport = (yearMonth: string, actualBalance: number) => ({
  id: `${yearMonth}-CASH_FLOW`,
  householdId: 'h1',
  yearMonth,
  type: 'CASH_FLOW' as const,
  data: {
    yearMonth,
    operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '籌資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 0,
    beginningBalance: 0,
    endingBalance: actualBalance,
    actualBalance,
    adjustment: 0,
  },
});

const period = (yearMonth: string, status: string) => ({ yearMonth, status });

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReportListPage />
    </MemoryRouter>,
  );

describe('ReportListPage', () => {
  beforeEach(() => {
    mocks.listReportsExecute.mockReset();
    mocks.listPeriodsExecute.mockReset();
    mockAnalysis.mockReset();
    mockAnalysis.mockResolvedValue(analysisResult());
  });

  it('summarises the latest report period with all three figures, and lists history newest-first', async () => {
    mocks.listReportsExecute.mockResolvedValue([
      incomeReport('2026-05', 30000),
      incomeReport('2026-06', 50000),
      balanceReport('2026-06', 200000),
      cashReport('2026-06', 80000),
      balanceReport('2026-05', 150000),
      cashReport('2026-05', 60000),
    ]);
    mocks.listPeriodsExecute.mockResolvedValue([
      period('2026-06', 'IN_PROGRESS'),
      period('2026-05', 'CLOSED'),
    ]);

    renderPage();

    // Summary: the anchor period and its four figures.
    const assets = await screen.findByRole('link', { name: '總資產，前往淨資產趨勢' });
    expect(assets).toHaveTextContent('NT$600,000');
    // The shared period sits outside the links, in the section header only.
    expect(assets).not.toHaveTextContent('2026 年 6 月');
    expect(screen.getAllByText('2026 年 6 月')).toHaveLength(1);
    expect(screen.getByRole('link', { name: '淨資產，前往淨資產趨勢' })).toHaveTextContent(
      'NT$450,000',
    );
    expect(screen.getByRole('link', { name: '總負債，前往淨資產趨勢' })).toHaveTextContent(
      'NT$150,000',
    );
    expect(screen.getByRole('link', { name: '儲蓄率，前往收支分析' })).toHaveTextContent('12.5%');

    // History lists every period, newest first.
    const periods = screen
      .getAllByTestId(/report-history-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(periods[0]).toBe('report-history-row-2026-06');
    expect(periods).toContain('report-history-row-2026-05');

    // Status badge shows only for the non-closed period.
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    expect(screen.queryByText('CLOSED')).not.toBeInTheDocument();

    // The month/year toggle sits with the history table, not in the page header.
    const historySection = screen
      .getByText(REPORT_LIST_LABELS.HISTORY_SECTION_TITLE)
      .closest('section');
    expect(
      within(historySection as HTMLElement).getByRole('button', {
        name: REPORT_LIST_LABELS.MODE_YEARLY,
      }),
    ).toBeInTheDocument();
  });

  it('deep-links each KPI into the analysis and flags an unclosed anchor', async () => {
    mockAnalysis.mockResolvedValue(
      analysisResult({
        anchor: { yearMonth: '2026-06', closed: false },
        kpis: {
          yearMonth: '2026-06',
          assets: 600000,
          netWorth: 450000,
          liabilities: 150000,
          savingsRate: null,
          anchorClosed: false,
        },
      }),
    );
    mocks.listReportsExecute.mockResolvedValue([]);
    mocks.listPeriodsExecute.mockResolvedValue([]);

    renderPage();

    const assets = await screen.findByRole('link', { name: '總資產，前往淨資產趨勢' });
    expect(assets.getAttribute('href')).toBe('/reports/analysis?series=assets#net-worth');
    expect(screen.getByRole('link', { name: '總負債，前往淨資產趨勢' }).getAttribute('href')).toBe(
      '/reports/analysis?series=debt#net-worth',
    );
    expect(screen.getByRole('link', { name: '儲蓄率，前往收支分析' }).getAttribute('href')).toBe(
      '/reports/analysis#income',
    );
    expect(screen.getByRole('link', { name: '儲蓄率，前往收支分析' })).toHaveTextContent('—');
    expect(screen.getAllByText('未關帳')).toHaveLength(1);
    expect(screen.getByText(/查看完整分析/)).toBeInTheDocument();
  });

  it('aggregates the same data into year rows when switched to the year granularity', async () => {
    mocks.listReportsExecute.mockResolvedValue([
      incomeReport('2026-05', 30000),
      incomeReport('2026-06', 50000),
      balanceReport('2026-06', 200000),
      cashReport('2026-06', 80000),
    ]);
    mocks.listPeriodsExecute.mockResolvedValue([]);

    renderPage();
    await waitFor(() => expect(screen.getAllByText('2026-06').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: REPORT_LIST_LABELS.MODE_YEARLY }));

    await waitFor(() => expect(screen.getAllByTestId('report-history-row-2026').length).toBe(2));
    // Year net income is the sum of its months; equity/cash take the last report.
    expect(screen.getAllByText('NT$80,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NT$200,000').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no reports or periods', async () => {
    mocks.listReportsExecute.mockResolvedValue([]);
    mocks.listPeriodsExecute.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(screen.getAllByText(REPORT_LIST_LABELS.EMPTY_TITLE).length).toBe(1));
  });

  it('shows a retryable error in the summary block when the analysis fails', async () => {
    mockAnalysis.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(analysisResult());
    mocks.listReportsExecute.mockResolvedValue([]);
    mocks.listPeriodsExecute.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(REPORT_ANALYSIS_LABELS.LOAD_ERROR)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: REPORT_ANALYSIS_LABELS.RETRY_ACTION }));

    expect(await screen.findByRole('link', { name: '淨資產，前往淨資產趨勢' })).toHaveTextContent(
      'NT$450,000',
    );
  });

  it('shows a retryable warning when loading fails', async () => {
    mocks.listReportsExecute.mockRejectedValue(new Error('boom'));
    mocks.listPeriodsExecute.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(REPORT_LIST_LABELS.LOAD_ERROR)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: REPORT_LIST_LABELS.RETRY_ACTION }),
    ).toBeInTheDocument();
  });
});
