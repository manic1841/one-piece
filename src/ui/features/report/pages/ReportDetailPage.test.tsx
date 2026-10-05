import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REPORT_DETAIL_LABELS } from '@/ui/constants/report/reportCenterLabels';

import ReportDetailPage from './ReportDetailPage';

const mocks = vi.hoisted(() => ({
  getBundleExecute: vi.fn(),
  getPeriodExecute: vi.fn(),
}));

vi.mock('@/application/report/use_cases/getStoredReportsBundleUseCase', () => ({
  getStoredReportsBundleUseCase: { execute: mocks.getBundleExecute },
}));

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: class {
    execute = mocks.getPeriodExecute;
  },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'h1' } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

const mockNavigate = vi.mocked(useNavigate);

const incomeData = {
  yearMonth: '2026-06',
  incomeTotal: 50000,
  expenseTotal: 20000,
  netIncome: 30000,
  incomeItems: [{ code: 'I1', label: '薪資', amount: 50000 }],
  expenseItems: [{ code: 'E1', label: '房租', amount: 20000 }],
};
const balanceData = {
  yearMonth: '2026-06',
  assets: {
    total: 200000,
    groups: {
      A: { label: '現金', total: 200000, items: [{ code: 'A1', label: '銀行', amount: 200000 }] },
    },
  },
  liabilities: { total: 0, groups: {} },
  equity: { total: 200000, groups: {} },
};
const cashData = {
  yearMonth: '2026-06',
  operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
  investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
  financing: { label: '籌資活動', total: 0, inflowItems: [], outflowItems: [] },
  netCashChange: 0,
  beginningBalance: 0,
  endingBalance: 80000,
  actualBalance: 80000,
  adjustment: 0,
};

const bundle = {
  incomeStatement: incomeData,
  balanceSheet: balanceData,
  cashFlow: cashData,
};

const renderPage = (period = '2026-06') =>
  render(
    <MemoryRouter initialEntries={[`/reports/${period}`]}>
      <Routes>
        <Route path="/reports/:period" element={<ReportDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportDetailPage', () => {
  beforeEach(() => {
    mocks.getBundleExecute.mockReset();
    mocks.getPeriodExecute.mockReset();
    mockNavigate.mockReset();
    mockNavigate.mockReturnValue(vi.fn());
  });

  it('renders the three statement tabs and the persisted income statement', async () => {
    mocks.getBundleExecute.mockResolvedValue(bundle);
    mocks.getPeriodExecute.mockResolvedValue({ yearMonth: '2026-06', status: 'CLOSED' });

    renderPage();

    await waitFor(() => expect(screen.getByText('薪資')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '損益表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '資產負債表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '現金流量表' })).toBeInTheDocument();
    expect(screen.getByText('收入合計')).toBeInTheDocument();
    // 三張表各帶三個摘要指標，值為已產生報表的當期值。
    expect(screen.getByTestId('statement-metric-income')).toHaveTextContent('NT$50,000');
    expect(screen.getByTestId('statement-metric-expense')).toHaveTextContent('NT$20,000');
    expect(screen.getByTestId('statement-metric-net-income')).toHaveTextContent('NT$30,000');
    expect(screen.getByTestId('statement-metric-assets')).toHaveTextContent('NT$200,000');
    expect(screen.getByTestId('statement-metric-liabilities')).toHaveTextContent('NT$0');
    expect(screen.getByTestId('statement-metric-equity')).toHaveTextContent('NT$200,000');
    expect(screen.getByTestId('statement-metric-beginning-balance')).toHaveTextContent('NT$0');
    expect(screen.getByTestId('statement-metric-ending-balance')).toHaveTextContent('NT$80,000');
    expect(screen.getByTestId('statement-metric-net-cash-change')).toHaveTextContent('NT$0');
    // The final summary row is emphasised in the primary colour.
    const terminus = screen
      .getAllByText('本期淨利')
      .find((node) => node.className.includes('text-primary'));
    expect(terminus).toBeDefined();
    // 結果型指標依正負上色（與月度關帳一致）。
    expect(
      screen.getByTestId('statement-metric-net-income').querySelector('.text-positive'),
    ).not.toBeNull();
    expect(
      screen.getByTestId('statement-metric-net-cash-change').querySelector('.text-positive'),
    ).toBeNull();
    // 三張表在行動版堆疊時各帶標題（桌機由 tabs 承擔）。
    for (const title of ['損益表', '資產負債表', '現金流量表']) {
      const mobileTitles = screen
        .getAllByText(title)
        .filter((node) => node.classList.contains('md:hidden'));
      expect(mobileTitles).toHaveLength(1);
    }
  });

  it('switches to the balance sheet tab', async () => {
    mocks.getBundleExecute.mockResolvedValue(bundle);
    mocks.getPeriodExecute.mockResolvedValue({ yearMonth: '2026-06', status: 'CLOSED' });

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '資產負債表' })).toBeInTheDocument(),
    );

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));

    expect(await screen.findByText('負債 + 權益')).toBeInTheDocument();
  });

  it('shows an empty state when the period has no persisted report', async () => {
    mocks.getBundleExecute.mockResolvedValue({
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    });
    mocks.getPeriodExecute.mockResolvedValue(null);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(REPORT_DETAIL_LABELS.EMPTY_TITLE)).toBeInTheDocument(),
    );
  });

  it('offers a link to monthly close for a non-closed period', async () => {
    const navigate = vi.fn();
    mockNavigate.mockReturnValue(navigate);
    mocks.getBundleExecute.mockResolvedValue(bundle);
    mocks.getPeriodExecute.mockResolvedValue({ yearMonth: '2026-06', status: 'IN_PROGRESS' });

    renderPage();

    const closeAction = await screen.findByRole('button', { name: /前往關帳/ });
    fireEvent.click(closeAction);
    expect(navigate).toHaveBeenCalledWith('/close/2026-06');
  });

  it('does not offer the close link for a closed period', async () => {
    mocks.getBundleExecute.mockResolvedValue(bundle);
    mocks.getPeriodExecute.mockResolvedValue({ yearMonth: '2026-06', status: 'CLOSED' });

    renderPage();

    await waitFor(() => expect(screen.getByText('薪資')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /前往關帳/ })).not.toBeInTheDocument();
  });

  it('steps to the previous calendar month', async () => {
    const navigate = vi.fn();
    mockNavigate.mockReturnValue(navigate);
    mocks.getBundleExecute.mockResolvedValue(bundle);
    mocks.getPeriodExecute.mockResolvedValue({ yearMonth: '2026-06', status: 'CLOSED' });

    renderPage();

    const prev = await screen.findByRole('button', { name: REPORT_DETAIL_LABELS.PREVIOUS_PERIOD });
    fireEvent.click(prev);
    expect(navigate).toHaveBeenCalledWith('/reports/2026-05');
  });
});
