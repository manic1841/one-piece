import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportAnalysisPage from './ReportAnalysisPage';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('@/application/report/use_cases/getFinancialAnalysisUseCase', () => ({
  getFinancialAnalysisUseCase: { execute: mockExecute },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'h1' } }),
}));

const point = (yearMonth: string, closed: boolean) => ({ yearMonth, closed });

const analysis = (overrides: Record<string, unknown> = {}) => ({
  anchor: { yearMonth: '2026-03', closed: false },
  kpis: {
    yearMonth: '2026-03',
    assets: 1000,
    netWorth: 900,
    liabilities: 100,
    savingsRate: 12.5,
    anchorClosed: false,
  },
  cutoff: '2026-03',
  unclosedMonths: ['2026-03'],
  range: '3y',
  availableRanges: ['1y', '3y'],
  netWorthPoints: [
    { ...point('2026-01', true), netWorth: 800, assets: 900, liabilities: 100 },
    { ...point('2026-02', false), netWorth: 850, assets: 950, liabilities: 100 },
    { ...point('2026-03', false), netWorth: 900, assets: 1000, liabilities: 100 },
  ],
  incomePoints: [
    { ...point('2026-01', true), income: 5000, expense: 4000, savingsRate: 20 },
    { ...point('2026-02', false), income: 4000, expense: 5000, savingsRate: -25 },
    { ...point('2026-03', false), income: 0, expense: 200, savingsRate: null },
  ],
  cashFlowPoints: [
    { ...point('2026-01', true), netCashFlow: -300 },
    { ...point('2026-03', false), netCashFlow: 500 },
  ],
  ...overrides,
});

const renderPage = (url = '/reports/analysis') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reports/analysis" element={<ReportAnalysisPage />} />
        <Route path="/reports/:period" element={<div>REPORT DETAIL</div>} />
        <Route path="/reports" element={<div>REPORT LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportAnalysisPage', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(analysis());
  });

  it('renders the three sections, the cutoff description and only distinct range options', async () => {
    renderPage();

    expect(await screen.findByText('淨資產趨勢')).toBeInTheDocument();
    expect(screen.getByText('收支與儲蓄率')).toBeInTheDocument();
    expect(screen.getAllByText('淨現金流').length).toBeGreaterThan(0);
    expect(screen.getByText('資料截至 2026-03，含 1 期未關帳')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '3Y' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: '5Y' })).toBeNull();
  });

  it('shows the anchor-period value beside each section it applies to', async () => {
    renderPage();

    // Net worth and savings rate exist at the anchor (2026-03); savings rate is null there.
    expect(await screen.findByText('NT$900')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('scrolls to the deep-linked section once the analysis resolves', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.history.replaceState(null, '', '/reports/analysis#income');

    renderPage('/reports/analysis#income');

    await screen.findByText('收支與儲蓄率');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('income'));
  });

  it('preselects the series named by ?series=', async () => {
    renderPage('/reports/analysis?series=assets');

    expect(await screen.findByRole('button', { name: '總資產' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '總負債' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a context series out of the chart and its accessibility label', async () => {
    renderPage('/reports/analysis?series=debt');

    const chart = await screen.findByRole('slider', { name: /淨資產趨勢/ });
    expect(chart.getAttribute('aria-label')).toContain('總負債');

    fireEvent.click(screen.getByRole('button', { name: '總負債' }));

    await waitFor(() => {
      const updated = screen.getByRole('slider', { name: /淨資產趨勢/ });
      expect(updated.getAttribute('aria-label')).not.toContain('總負債');
    });
    expect(screen.getByRole('button', { name: '總負債' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reads values through the keyboard tooltip', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /淨資產趨勢/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/淨資產 NT\$/);
    expect(tooltip.textContent).toContain('NT$800');
  });

  it('drills into the period report on Enter', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /淨資產趨勢/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'Enter' });

    expect(await screen.findByText('REPORT DETAIL')).toBeInTheDocument();
  });

  it('marks unclosed runs and lists the affected months', async () => {
    renderPage();

    await screen.findByText('淨資產趨勢');
    // One marker per chart, at the first month of each contiguous run.
    expect(screen.getAllByText('未關帳').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('未關帳月份：2026-03')).toBeInTheDocument();
  });

  it('collapses a long unclosed note and links back to the history', async () => {
    mockExecute.mockResolvedValue(
      analysis({
        unclosedMonths: [
          '2025-01',
          '2025-02',
          '2025-03',
          '2025-04',
          '2025-05',
          '2025-06',
          '2025-07',
        ],
      }),
    );

    renderPage();

    expect(await screen.findByText('未關帳月份：2025-01 起等 7 期')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看報表歷史' }));
    expect(await screen.findByText('REPORT LIST')).toBeInTheDocument();
  });

  it('shows the insufficient hint for blocks under two periods', async () => {
    mockExecute.mockResolvedValue(
      analysis({ netWorthPoints: analysis().netWorthPoints.slice(0, 1) }),
    );

    renderPage();

    expect(await screen.findByText('此範圍內不足 2 期')).toBeInTheDocument();
  });

  it('shows an empty state when there is no anchor balance sheet', async () => {
    mockExecute.mockResolvedValue(
      analysis({
        anchor: null,
        kpis: {
          yearMonth: null,
          assets: null,
          netWorth: null,
          liabilities: null,
          savingsRate: null,
          anchorClosed: null,
        },
        netWorthPoints: [],
        incomePoints: [],
        cashFlowPoints: [],
      }),
    );

    renderPage();

    expect(await screen.findByText('NO REPORTS')).toBeInTheDocument();
  });

  it('shows a retryable warning when the load fails', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    renderPage();

    expect(await screen.findByText('無法載入分析資料。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
  });

  it('stacks the two side-by-side sections below lg and keeps the drilldown period', async () => {
    renderPage();

    await screen.findByText('收支與儲蓄率');
    const income = screen.getByText('收支與儲蓄率').closest('section')?.parentElement;
    expect(income?.parentElement?.className).toContain('lg:grid-cols-2');
  });
});
