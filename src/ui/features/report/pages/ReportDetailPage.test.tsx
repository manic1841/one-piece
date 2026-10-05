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
    <MemoryRouter initialEntries={[`/report-next/${period}`]}>
      <Routes>
        <Route path="/report-next/:period" element={<ReportDetailPage />} />
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
    expect(screen.getByText('本期淨利')).toBeInTheDocument();
    // The final summary row is emphasised in the primary colour.
    expect(screen.getByText('本期淨利').className).toContain('text-primary');
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
    expect(navigate).toHaveBeenCalledWith('/report-next/2026-05');
  });
});
