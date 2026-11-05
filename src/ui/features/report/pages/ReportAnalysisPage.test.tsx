import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportAnalysisPage from './ReportAnalysisPage';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('@/application/report/use_cases/getFinancialAnalysisWorkflow', () => ({
  getFinancialAnalysisWorkflow: { execute: mockExecute },
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
  unclosedMonths: ['2026-03'],
  range: '3y',
  availableRanges: ['1y', '3y'],
  netWorthPoints: [
    { ...point('2026-01', true), netWorth: 800, assets: 900, liabilities: 100 },
    { ...point('2026-02', false), netWorth: 850, assets: 950, liabilities: 100 },
    { ...point('2026-03', false), netWorth: 900, assets: 1000, liabilities: 100 },
  ],
  assetCompositionPoints: [
    { ...point('2026-01', true), assetsTotal: 1000, cash: 200, investment: 300, property: 500 },
    { ...point('2026-02', false), assetsTotal: 1000, cash: 300, investment: 400, property: 300 },
    { ...point('2026-03', false), assetsTotal: 1000, cash: 400, investment: 500, property: 100 },
  ],
  investmentPerformancePoints: [
    { ...point('2026-01', true), gain: 100, openingValue: 1000, returnRate: 10 },
    { ...point('2026-02', false), gain: -50, openingValue: 1200, returnRate: -4.2 },
    { ...point('2026-03', false), gain: 0, openingValue: 0, returnRate: null },
  ],
  debtLeveragePoints: [
    {
      ...point('2026-01', true),
      liabilities: 100,
      assetsTotal: 1000,
      debtRatio: 10,
      leverage: 1.2,
    },
    {
      ...point('2026-02', false),
      liabilities: 120,
      assetsTotal: 1000,
      debtRatio: 12,
      leverage: null,
    },
    {
      ...point('2026-03', false),
      liabilities: 140,
      assetsTotal: 1000,
      debtRatio: 14,
      leverage: 1.5,
    },
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

  it('renders every section in order with a matching index and only distinct range options', async () => {
    renderPage();

    await waitFor(() => expect(document.getElementById('net-worth')).not.toBeNull());
    const ids = [
      'net-worth',
      'asset-composition',
      'investment-performance',
      'income',
      'cash-flow',
      'debt-leverage',
    ];
    expect(ids.map((id) => document.getElementById(id)?.querySelector('p')?.textContent)).toEqual([
      '淨資產趨勢',
      '資產類別構成',
      '投資績效',
      '收支與儲蓄率',
      '淨現金流',
      '負債與槓桿',
    ]);

    const index = screen.getByRole('navigation', { name: '分析區塊' });
    expect(index.querySelectorAll('a')).toHaveLength(6);
    expect(screen.getByText('資料截至 2026-03，含 1 期未關帳')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '3Y' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: '5Y' })).toBeNull();
  });

  it('shows the anchor-period value beside each section it applies to', async () => {
    renderPage();

    // Net worth and savings rate exist at the anchor (2026-03); savings rate is null there.
    expect(await screen.findByText('2026-03 · NT$900')).toBeInTheDocument();
    expect(screen.getByText('2026-03 · —')).toBeInTheDocument();
  });

  it('scrolls to the deep-linked section once the analysis resolves', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.history.replaceState(null, '', '/reports/analysis#income');

    renderPage('/reports/analysis#income');

    await screen.findAllByText('收支與儲蓄率');
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

  it('keeps a hidden series out of the tooltip', async () => {
    renderPage('/reports/analysis?series=debt');

    const chart = await screen.findByRole('slider', { name: /淨資產趨勢/ });
    fireEvent.click(screen.getByRole('button', { name: '淨資產' }));
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/總負債 NT\$/);
    expect(tooltip.textContent).not.toContain('淨資產');
  });

  it('shows asset amounts and shares at the anchor and keeps the denominator when a class is hidden', async () => {
    renderPage();

    expect(await screen.findByText('2026-03 · 總資產 NT$1,000')).toBeInTheDocument();

    const chart = await screen.findByRole('slider', { name: /資產類別構成/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/現金與銀行 NT\$200/);
    expect(tooltip.parentElement?.textContent).toContain('20.0%');
    expect(tooltip.parentElement?.textContent).toContain('不動產');

    fireEvent.click(screen.getByRole('button', { name: '現金與銀行' }));
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    await waitFor(() => {
      const updated = screen.getByRole('slider', { name: /資產類別構成/ });
      expect(updated.getAttribute('aria-label')).not.toContain('現金與銀行');
    });
    // The hidden class is gone from the tooltip but the share is still of total assets.
    const after = screen.getByText(/投資資產 NT\$400/);
    expect(after.parentElement?.textContent).toContain('40.0%');
  });

  it('fixes the composition axis at 0–100% in 25% steps', async () => {
    renderPage();

    await screen.findByRole('slider', { name: /資產類別構成/ });

    for (const tick of ['0%', '25%', '50%', '75%', '100%']) {
      expect(screen.getAllByText(tick).length).toBeGreaterThan(0);
    }
  });

  it('lets the visible composition shares sum below 100%', async () => {
    renderPage();

    await screen.findByRole('slider', { name: /資產類別構成/ });
    fireEvent.click(screen.getByRole('button', { name: '現金與銀行' }));
    await waitFor(() => {
      expect(screen.getByRole('slider', { name: /資產類別構成/ }).getAttribute('aria-label')).not.toContain(
        '現金與銀行',
      );
    });
    const chart = screen.getByRole('slider', { name: /資產類別構成/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/投資資產 NT\$300/);
    expect(tooltip.parentElement?.textContent).toContain('30.0%');
    expect(tooltip.parentElement?.textContent).toContain('50.0%');
    expect(tooltip.parentElement?.textContent).not.toContain('現金');
  });

  it('drills from the asset composition into the period report', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /資產類別構成/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'Enter' });

    expect(await screen.findByText('REPORT DETAIL')).toBeInTheDocument();
  });

  it('drills from a mouse click on the composition', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /資產類別構成/ });
    chart.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect;
    fireEvent.click(chart, { clientX: 10 });

    expect(await screen.findByText('REPORT DETAIL')).toBeInTheDocument();
  });

  it('reads the gain, return rate and opening value in a fixed tooltip order', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /投資績效/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/報酬金額 -NT\$50/);
    expect(tooltip.textContent).toBe('報酬金額 -NT$50');
    expect(tooltip.parentElement?.querySelectorAll('p')[2]?.textContent).toBe(
      '報酬率 -4.2% · 期初市值 NT$1,200',
    );
  });

  it('breaks the return line where the opening value is zero', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /投資績效/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/報酬金額 NT\$0/);
    expect(tooltip.parentElement?.textContent).toContain('報酬率 —');
  });

  it('shows the same full tooltip on the return-rate layer', async () => {
    renderPage();

    const line = await screen.findByRole('slider', { name: '報酬率' });
    fireEvent.keyDown(line, { key: 'ArrowRight' });
    fireEvent.keyDown(line, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/報酬金額 -NT\$50/);
    expect(tooltip.parentElement?.textContent).toContain('期初市值 NT$1,200');
  });

  it('shows the same full tooltip on the leverage layer', async () => {
    renderPage();

    const line = await screen.findByRole('slider', { name: '加權平均槓桿' });
    fireEvent.keyDown(line, { key: 'ArrowRight' });
    fireEvent.keyDown(line, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/負債餘額 NT\$120/);
    expect(tooltip.parentElement?.textContent).toContain('加權平均槓桿');
  });

  it('stacks the income and cash-flow pair into one column on mobile', async () => {
    renderPage();

    const income = await screen.findByRole('slider', { name: /收支與儲蓄率/ });
    void income;
    await waitFor(() => expect(document.getElementById('cash-flow')).not.toBeNull());
    const grid = document.getElementById('income')?.parentElement;
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('lg:grid-cols-2');
    expect(grid?.contains(document.getElementById('cash-flow'))).toBe(true);
  });

  it('shows insufficient data for the new blocks under two periods', async () => {
    const base = analysis();
    mockExecute.mockResolvedValue(
      analysis({
        assetCompositionPoints: base.assetCompositionPoints.slice(0, 1),
        investmentPerformancePoints: base.investmentPerformancePoints.slice(0, 1),
        debtLeveragePoints: base.debtLeveragePoints.slice(0, 1),
      }),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('此範圍內不足 2 期')).toHaveLength(3),
    );
  });

  it('shows the leverage layer while the range contains leverage', async () => {
    renderPage();

    expect(await screen.findByText('加權平均槓桿 x')).toBeInTheDocument();
    expect(screen.getByText('2026-03 · 負債比 14.0%')).toBeInTheDocument();
  });

  it('drops the leverage layer when the range has no leverage', async () => {
    mockExecute.mockResolvedValue(
      analysis({
        debtLeveragePoints: analysis().debtLeveragePoints.map((point) => ({
          ...point,
          leverage: null,
        })),
      }),
    );

    renderPage();

    expect(await screen.findByText('此範圍內持倉無槓桿')).toBeInTheDocument();
    expect(screen.queryByText('加權平均槓桿 x')).toBeNull();

    const chart = await screen.findByRole('slider', { name: /負債與槓桿/ });
    expect(chart.getAttribute('aria-label')).not.toContain('加權平均槓桿');
  });

  it('lists debt balance before the ratio in the tooltip', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /負債與槓桿/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = await screen.findByText(/負債餘額 NT\$120/);
    expect(tooltip.textContent).toBe('負債餘額 NT$120');
    expect(tooltip.parentElement?.querySelectorAll('p')[2]?.textContent).toBe(
      '負債比 12.0% · 加權平均槓桿 —',
    );
  });

  it('keeps the cash-flow chart mounted when its only series is toggled off', async () => {
    renderPage();

    expect(await screen.findByRole('slider', { name: /淨現金流/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '淨現金流' }));

    await waitFor(() => {
      const updated = screen.getByRole('slider', { name: /淨現金流/ });
      expect(updated.getAttribute('aria-label')).not.toContain('顯示：淨現金流');
    });
  });

  it('formats a negative savings rate', async () => {
    renderPage();

    const chart = await screen.findByRole('slider', { name: /收支與儲蓄率/ });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(await screen.findByText(/-25\.0%/)).toBeInTheDocument();
  });

  it('keeps the month labels when the savings series is toggled off', async () => {
    renderPage();

    await screen.findAllByText('收支與儲蓄率');
    const before = screen.getAllByText('JAN 2026').length;

    fireEvent.click(screen.getByRole('button', { name: '儲蓄率' }));

    expect(screen.getAllByText('JAN 2026').length).toBe(before);
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

    await screen.findAllByText('淨資產趨勢');
    // One marker per chart, at the first month of each contiguous run.
    expect(screen.getAllByText('未關帳').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('2026-03')).toBeInTheDocument();
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

    expect(await screen.findByText('2025-01 起等 7 期')).toBeInTheDocument();
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
        assetCompositionPoints: [],
        investmentPerformancePoints: [],
        incomePoints: [],
        cashFlowPoints: [],
        debtLeveragePoints: [],
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

  it('puts the income and cash-flow sections side by side in one wrapper', async () => {
    renderPage();

    await screen.findAllByText('收支與儲蓄率');
    const income = screen.getAllByText('收支與儲蓄率')[0]?.closest('section');
    const cashFlow = screen.getAllByText('淨現金流')[0]?.closest('section');
    expect(income?.parentElement?.parentElement).toBe(cashFlow?.parentElement?.parentElement);
  });

  it('shows a skeleton while loading', async () => {
    mockExecute.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(await screen.findByText('載入分析中…')).toBeInTheDocument();
  });
});
