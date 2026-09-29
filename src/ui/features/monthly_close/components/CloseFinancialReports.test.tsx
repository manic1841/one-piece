import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';

import { CloseFinancialReports } from './CloseFinancialReports';

vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));
vi.mock('@/application/report/use_cases/getStoredReportsBundleUseCase', () => ({
  getStoredReportsBundleUseCase: {
    execute: vi.fn().mockResolvedValue({
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    }),
  },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: {
    execute: vi.fn().mockResolvedValue({
      isReady: true,
      unsettledProjects: [],
      unsettledAccounts: [],
      unsettledPortfolios: [],
      unsettledDebts: [],
      totalUnsettled: 0,
      year: 2026,
      month: 3,
    }),
  },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => ({ uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false }),
}));

const mockExecute = vi.mocked(previewFinancialReportsWorkflow.execute);

const buildPreview = (overrides?: {
  isPersisted?: boolean;
  timestamps?: { incomeStatement?: string; balanceSheet?: string; cashFlow?: string };
  adjustment?: number;
}) => ({
  incomeStatement: {
    yearMonth: '2026-03',
    incomeTotal: 50000,
    expenseTotal: 30000,
    netIncome: 20000,
    incomeItems: [
      {
        code: 'income:salary',
        label: '薪資',
        amount: 50000,
        subItems: [{ code: 'income:salary:charles', label: '薪資 › Charles', amount: 50000 }],
      },
    ],
    expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
  },
  balanceSheet: {
    yearMonth: '2026-03',
    assets: {
      total: 100000,
      groups: {
        cash: {
          label: '現金與銀行',
          total: 100000,
          items: [{ code: 'account:1', label: '主力帳戶', amount: 100000 }],
        },
      },
    },
    liabilities: { total: 0, groups: { loan: { label: '貸款', total: 0, items: [] } } },
    equity: {
      total: 100000,
      groups: {
        openingEquity: { label: '期初餘額', total: 80000, items: [] },
        netIncome: { label: '本期淨利', total: 20000, items: [] },
        adjustment: { label: '調整', total: 0, items: [] },
      },
    },
  },
  cashFlow: {
    yearMonth: '2026-03',
    operating: {
      label: '營業活動',
      total: 20000,
      inflowItems: [{ code: 'income:salary', label: '薪資', amount: 50000 }],
      outflowItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
    },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 20000,
    beginningBalance: 0,
    endingBalance: 20000,
    actualBalance: 20000,
    adjustment: overrides?.adjustment ?? 0,
  },
  isPersisted: overrides?.isPersisted ?? false,
  timestamps: overrides?.timestamps ?? {},
});

const renderReports = (props?: Partial<Parameters<typeof CloseFinancialReports>[0]>) =>
  render(
    <CloseFinancialReports
      householdId="household-1"
      year={2026}
      month={3}
      onContinue={() => {}}
      onGenerate={() => {}}
      onBack={() => {}}
      confirming={false}
      isConfirmable={true}
      isReadOnly={false}
      isGenerated={false}
      {...props}
    />,
  );

describe('CloseFinancialReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(buildPreview() as never);
  });

  it('renders the income statement section header, roll-up row, nested subItems and total rows', async () => {
    renderReports();

    const statement = await screen.findByTestId('close-income-statement');
    await waitFor(() => expect(statement).toHaveTextContent('薪資'));
    expect(statement).toHaveTextContent('收入');
    expect(statement).toHaveTextContent('薪資 › Charles');
    expect(statement).toHaveTextContent('收入合計');
    expect(statement).toHaveTextContent('支出合計');
    expect(statement).toHaveTextContent('本期淨利');
    const balancePanel = screen.getByTestId('close-balance-sheet').closest('[role="tabpanel"]');
    expect(balancePanel).toHaveAttribute('data-state', 'inactive');
    expect(screen.getByTestId('close-balance-sheet')).toHaveTextContent('主力帳戶');
  });

  it('collapses and expands a statement row from the left chevron', async () => {
    renderReports();

    await waitFor(() =>
      expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles'),
    );
    const toggle = screen.getByRole('button', { name: '薪資' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(screen.getByTestId('close-income-statement')).not.toHaveTextContent('薪資 › Charles');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles');
  });

  it('resets collapsed groups when switching statement tabs', async () => {
    renderReports();

    await waitFor(() =>
      expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles'),
    );
    fireEvent.click(screen.getByRole('button', { name: '薪資' }));
    expect(screen.getByTestId('close-income-statement')).not.toHaveTextContent('薪資 › Charles');

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: '損益表' }));

    expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles');
  });

  it('switches statement tabs on desktop', async () => {
    renderReports();

    await waitFor(() => expect(screen.getByTestId('close-income-statement')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));
    expect(screen.getByTestId('close-balance-sheet')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: '現金流量表' }));
    expect(screen.getByTestId('close-cash-flow')).toBeInTheDocument();
  });

  it('renders the balance sheet sections, group totals and the closing liabilities + equity row', async () => {
    renderReports();

    await waitFor(() => expect(screen.getByTestId('close-income-statement')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));

    const sheet = screen.getByTestId('close-balance-sheet');
    expect(sheet).toHaveTextContent('資產');
    expect(sheet).toHaveTextContent('現金與銀行');
    expect(sheet).toHaveTextContent('資產合計');
    expect(sheet).toHaveTextContent('負債 + 權益');
    // Zero-total, empty groups and the removed Calculated tag do not render.
    expect(sheet).not.toHaveTextContent('貸款');
    expect(sheet).not.toHaveTextContent('Calculated');
  });

  it('renders the cash flow hierarchy with inflow/outflow buckets and the unchanged footer', async () => {
    renderReports();

    await waitFor(() => expect(screen.getByTestId('close-income-statement')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('tab', { name: '現金流量表' }));

    const statement = screen.getByTestId('close-cash-flow');
    expect(statement).toHaveTextContent('營業活動');
    expect(statement).toHaveTextContent('流入');
    expect(statement).toHaveTextContent('流出');
    expect(statement).toHaveTextContent('營業活動合計');
    expect(statement).toHaveTextContent('現金淨變動');
    expect(statement).toHaveTextContent('實際餘額');
  });

  it('shows the reports generated panel with timestamps when persisted', async () => {
    renderReports({
      isGenerated: true,
    });
    mockExecute.mockResolvedValue(
      buildPreview({
        isPersisted: true,
        timestamps: { incomeStatement: '14:30', balanceSheet: '14:30', cashFlow: '14:31' },
      }) as never,
    );

    await waitFor(() => expect(screen.getByTestId('reports-generated-panel')).toBeInTheDocument());
    expect(screen.getByText(/損益表 14:30/)).toBeInTheDocument();
    expect(screen.queryByTestId('generate-reports')).not.toBeInTheDocument();
  });

  it('disables generate behind the readiness gate with missing category names', async () => {
    const { getSettlementReadinessUseCase } = await import(
      '@/application/report/use_cases/getSettlementReadinessUseCase'
    );
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      isReady: false,
      unsettledAccounts: [{ name: '現金' } as never],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 1,
    });

    renderReports();

    await waitFor(() => expect(screen.getByTestId('generate-reports')).toBeInTheDocument());
    expect(screen.getByText(/尚未完成所有類別的月結算/)).toBeInTheDocument();
    expect(screen.getByTestId('generate-reports')).toBeDisabled();
  });

  it('warns when the cash flow adjustment exceeds 1000', async () => {
    mockExecute.mockResolvedValue(buildPreview({ adjustment: 1500 }) as never);

    renderReports();

    await waitFor(() => expect(screen.getByText(/現金流調整超過 1,000/)).toBeInTheDocument());
  });

  it('annotates a preview figure that drifted from the persisted report', async () => {
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue({
      incomeStatement: { ...buildPreview().incomeStatement, incomeTotal: 40000 },
      balanceSheet: null,
      cashFlow: null,
    } as never);

    renderReports();

    await waitFor(() => expect(screen.getByText('NT$40,000 -> NT$50,000')).toBeInTheDocument());
  });

  it('renders the persisted record with no drift marks when the period is closed', async () => {
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue({
      incomeStatement: { ...buildPreview().incomeStatement, incomeTotal: 40000 },
      balanceSheet: null,
      cashFlow: null,
    } as never);

    renderReports({ isReadOnly: true, isGenerated: true });

    await waitFor(() => expect(screen.getByTestId('close-income-statement')).toBeInTheDocument());
    expect(screen.getByTestId('close-income-statement')).toHaveTextContent('NT$40,000');
    expect(screen.queryByText(/->/)).not.toBeInTheDocument();
  });

  it('keeps comparing after a reopen, when persisted files remain', async () => {
    // Reopened period: not CLOSED, FINANCIAL_REPORTS back to PENDING, files left behind.
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue({
      incomeStatement: { ...buildPreview().incomeStatement, incomeTotal: 40000 },
      balanceSheet: null,
      cashFlow: null,
    } as never);

    renderReports({ isGenerated: true });

    await waitFor(() => expect(screen.getByText('NT$40,000 -> NT$50,000')).toBeInTheDocument());
  });
});
