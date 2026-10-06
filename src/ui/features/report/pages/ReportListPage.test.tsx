import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REPORT_LIST_LABELS } from '@/ui/constants/report/reportCenterLabels';

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

    // Summary: the most recent period that has a report, with all three figures.
    await waitFor(() => expect(screen.getByTestId('report-latest-net-income')).toBeInTheDocument());
    expect(screen.getByTestId('report-latest-net-income')).toHaveTextContent('NT$50,000');
    expect(screen.getByTestId('report-latest-equity')).toHaveTextContent('NT$200,000');
    expect(screen.getByTestId('report-latest-cash')).toHaveTextContent('NT$80,000');
    expect(screen.getAllByText('2026 年 6 月').length).toBeGreaterThan(0);

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
