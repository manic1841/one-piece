import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type Account } from '@/domains/account/types/account';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { mapPeriodToPageVM } from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';

import {
  type CloseStepContext,
  type UseCloseStepRegistryArgs,
  useCloseStepRegistry,
} from './useCloseStepRegistry';

// Hoisted and stable on purpose: the real `useAuthIdentity` is memoized, and a
// fresh identity object per render would change every stage hook's load
// callback identity and re-run its effect forever.
const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase', () => ({
  getMonthInvestmentFinancingUseCase: {
    execute: vi.fn().mockResolvedValue({
      buys: [],
      sells: [],
      shareholderFinancing: [],
      dividendPayout: [],
    }),
  },
}));
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-08', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: false, timestamps: {} }),
  },
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-08', activities: [], anomalies: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn().mockResolvedValue(null) },
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
vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

const baseContext: CloseStepContext = {
  stepText: 'ACCOUNT_BALANCE',
  progressText: '01 / 09',
  confirmedAtText: null,
  confirming: false,
  isConfirmable: true,
  isReadOnly: false,
  isReviewing: false,
  onConfirm: vi.fn(),
  onGoToStage: vi.fn(),
  onContinue: vi.fn(),
  onBack: vi.fn(),
  accounts: [],
  portfolios: [],
};

const readinessFixture = {
  year: 2026,
  month: 8,
  isReady: true,
  totalAccounts: 0,
  totalPortfolios: 0,
  totalDebts: 0,
  totalProjects: 0,
  unsettledAccounts: [],
  unsettledPortfolios: [],
  unsettledDebts: [],
  unsettledProjects: [],
  totalUnsettled: 0,
};

const startedPageVM = mapPeriodToPageVM(
  {
    id: '2026-08',
    yearMonth: '2026-08',
    status: 'IN_PROGRESS',
    stages: {},
    reviewSourceStageId: null,
  } as never,
  '2026-08',
);

const baseArgs: UseCloseStepRegistryArgs = {
  householdId: 'household-1',
  selectedYearMonth: '2026-08',
  confirmingStageId: null,
  accounts: [],
  portfolios: [],
  projects: [],
  debtAccounts: [],
  pageVM: startedPageVM,
};

const account = (id: string): Account =>
  ({
    id,
    name: `帳戶 ${id}`,
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as Account;

/** A live period whose only meaningful fact is the FINANCIAL_REPORTS stage state. */
const pageVMWithReportsStage = (status: 'PENDING' | 'COMPLETED') =>
  mapPeriodToPageVM(
    {
      id: '2026-08',
      yearMonth: '2026-08',
      status: 'IN_PROGRESS',
      stages: { FINANCIAL_REPORTS: { status } },
      reviewSourceStageId: null,
    } as never,
    '2026-08',
  );

const renderRegistry = (overrides: Partial<UseCloseStepRegistryArgs> = {}) =>
  renderHook(() => useCloseStepRegistry({ ...baseArgs, ...overrides }));

const emptyStatement = () => ({
  yearMonth: '2026-08',
  incomeTotal: 0,
  expenseTotal: 0,
  netIncome: 0,
  incomeItems: [],
  expenseItems: [],
});

const emptyCashFlow = (netCashChange = 0, adjustment = 0) => ({
  yearMonth: '2026-08',
  operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
  investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
  financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
  netCashChange,
  beginningBalance: 0,
  endingBalance: 0,
  actualBalance: 0,
  adjustment,
});

const balanceSheetOf = (totalAssets = 0, totalLiabilities = 0, equity = 0) => ({
  yearMonth: '2026-08',
  assets: { total: totalAssets, groups: {} },
  liabilities: { total: totalLiabilities, groups: {} },
  equity: { total: equity, groups: {} },
});

const previewFixture = (adjustment: number) =>
  ({
    incomeStatement: emptyStatement(),
    balanceSheet: balanceSheetOf(),
    cashFlow: emptyCashFlow(0, adjustment),
  }) as never;

const previewWithTotals = (totals: {
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  equity?: number;
  netCashChange?: number;
}) =>
  ({
    incomeStatement: { ...emptyStatement(), netIncome: totals.netIncome ?? 0 },
    balanceSheet: balanceSheetOf(totals.totalAssets, totals.totalLiabilities, totals.equity),
    cashFlow: emptyCashFlow(totals.netCashChange ?? 0),
    isPersisted: false,
    timestamps: {},
  }) as never;

const persistedWithTotals = (totals: {
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  equity?: number;
  netCashChange?: number;
}) =>
  ({
    incomeStatement: { ...emptyStatement(), netIncome: totals.netIncome ?? 0 },
    balanceSheet: balanceSheetOf(totals.totalAssets, totals.totalLiabilities, totals.equity),
    cashFlow: emptyCashFlow(totals.netCashChange ?? 0),
  }) as never;

describe('useCloseStepRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readinessFixture);
  });

  it('registers all nine close steps', () => {
    const { result } = renderRegistry();

    expect(Object.keys(result.current)).toHaveLength(9);
    expect(Object.keys(result.current)).toEqual([
      'ACCOUNT_BALANCE',
      'SECURITIES_TRADE',
      'PORTFOLIO_CASH_FLOW',
      'PROJECT_SETTLEMENT',
      'DEBT_REPAYMENT',
      'TRANSACTION_VALIDATION',
      'COMPLETENESS_CHECK',
      'FINANCIAL_REPORTS',
      'CLOSE_PERIOD',
    ]);
  });

  it('dispatches COMPLETENESS_CHECK to the readiness check via the content factory', async () => {
    function CompletenessHarness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.COMPLETENESS_CHECK.render(baseContext)}</>;
    }

    render(<CompletenessHarness />);

    await waitFor(() => expect(screen.getByTestId('close-readiness-check')).toBeInTheDocument());
  });

  it('renders nothing for COMPLETENESS_CHECK while readiness is missing', () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockReturnValue(new Promise(() => {}));
    const { result } = renderRegistry();

    const { container } = render(<>{result.current.COMPLETENESS_CHECK.render(baseContext)}</>);

    expect(container).toBeEmptyDOMElement();
  });

  // T3 (#227): Step 7 aggregates COMPLETENESS_CHECK's readiness with
  // TRANSACTION_VALIDATION's checked count and issues. A TRANSACTION_VALIDATION
  // failure alone used to render as "checked 0, no issues" — indistinguishable
  // from a clean month — with confirm still enabled.
  it('surfaces a TRANSACTION_VALIDATION load failure in Step 7 and blocks confirm', async () => {
    vi.mocked(validateMonthTransactionsUseCase.execute).mockRejectedValue(new Error('boom'));

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.COMPLETENESS_CHECK.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入交易驗證結果，請稍後再試。'),
    );
    expect(screen.getByTestId('readiness-confirm')).toBeDisabled();
  });

  it('surfaces a COMPLETENESS_CHECK load failure in Step 7 and blocks confirm', async () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockRejectedValue(new Error('boom'));

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.COMPLETENESS_CHECK.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入結算就緒狀態，請稍後再試。'),
    );
  });

  it('blocks Step 7 confirm while TRANSACTION_VALIDATION is still loading', async () => {
    vi.mocked(validateMonthTransactionsUseCase.execute).mockReturnValue(
      new Promise(() => {}) as never,
    );

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.COMPLETENESS_CHECK.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('readiness-confirm')).toBeInTheDocument());
    expect(screen.getByTestId('readiness-confirm')).toBeDisabled();
  });
  it('dispatches CLOSE_PERIOD to the summary panel via the content factory', () => {
    const { result } = renderRegistry();

    render(<>{result.current.CLOSE_PERIOD.render(baseContext)}</>);

    expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
  });

  it('dispatches FINANCIAL_REPORTS to the reports panel via the content factory', () => {
    const { result } = renderRegistry();

    render(<>{result.current.FINANCIAL_REPORTS.render(baseContext)}</>);

    expect(screen.getAllByText(MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE).length).toBe(2);
  });

  // Issue #222: a legacy pre-workflow month or a reopened period carries
  // persisted reports while FINANCIAL_REPORTS is still PENDING. The action that
  // completes the stage must stay reachable, driven by stage completion rather
  // than report persistence.
  it('keeps the reports action reachable when reports persist but the stage is pending', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: { incomeStatement: '10:00' },
    });
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue({
      ...previewWithTotals({}),
      isPersisted: true,
      timestamps: { incomeStatement: '10:00' },
    } as never);
    const { result } = renderRegistry({ pageVM: pageVMWithReportsStage('PENDING') });

    await waitFor(() =>
      expect(result.current.CLOSE_PERIOD.evidence().kind).toBe('REPORT_PERSISTENCE'),
    );

    render(<>{result.current.FINANCIAL_REPORTS.render(baseContext)}</>);

    expect(screen.queryByTestId('reports-generated-panel')).not.toBeInTheDocument();
    expect(screen.getByText(/已有先前產生的報表/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByTestId('generate-reports')).toBeInTheDocument();
  });

  it('replaces the reports action with the generated panel once the stage is completed', () => {
    const { result } = renderRegistry({ pageVM: pageVMWithReportsStage('COMPLETED') });

    render(<>{result.current.FINANCIAL_REPORTS.render(baseContext)}</>);

    expect(screen.getByTestId('reports-generated-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('generate-reports')).not.toBeInTheDocument();
  });

  it('renders the shared chrome frame for a stage with inputs', () => {
    const { result } = renderRegistry();

    render(<>{result.current.ACCOUNT_BALANCE.render(baseContext)}</>);

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
  });

  it('builds per-project settlement evidence from the project settlement stage', async () => {
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([
      { id: 'project-1', name: '裝修', isActive: true },
      { id: 'project-2', name: '旅遊', isActive: true },
    ] as never);
    vi.mocked(listProjectSnapshotsUseCase.execute).mockImplementation(async (request) =>
      request.projectId === 'project-1'
        ? ([{ income: 5000, expense: 3000, closingBalance: 2000 }] as never)
        : ([] as never),
    );

    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.PROJECT_SETTLEMENT.evidence().projectSettlements).toHaveLength(2),
    );

    render(<>{result.current.PROJECT_SETTLEMENT.render(baseContext)}</>);

    expect(screen.getByText('裝修')).toBeInTheDocument();
    expect(screen.getByText('旅遊')).toBeInTheDocument();
    expect(screen.getByText(MONTHLY_CLOSE_LABELS.UNSETTLED)).toBeInTheDocument();
  });

  it('opens the trade drawer directly through the securities stage', () => {
    const { result } = renderRegistry();
    const control = result.current.SECURITIES_TRADE.control as unknown as {
      drawer: { open: (...args: unknown[]) => void };
    };
    const openSpy = vi.spyOn(control.drawer, 'open');

    render(<>{result.current.SECURITIES_TRADE.render(baseContext)}</>);

    fireEvent.click(screen.getAllByRole('button', { name: '新增交易' })[0]);
    expect(openSpy).toHaveBeenCalledWith('SECURITIES', 'ADD', undefined);
  });

  it('reflects the FINANCIAL_REPORTS persistence state in CLOSE_PERIOD evidence', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });
    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.CLOSE_PERIOD.evidence().kind).toBe('REPORT_PERSISTENCE'),
    );
    expect(result.current.CLOSE_PERIOD.evidence().reportsPersisted).toBe(true);
  });

  it("derives FINANCIAL_REPORTS evidence from CLOSE_PERIOD's preview bundle", async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(1500));
    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.FINANCIAL_REPORTS.evidence().kind).toBe('CASH_FLOW_ADJUSTMENTS'),
    );
    expect(result.current.FINANCIAL_REPORTS.evidence().cashFlowAdjustments).toBe(1500);
  });

  it('derives COMPLETENESS_CHECK evidence from its own stage hook', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue({
      yearMonth: '2026-08',
      activities: [],
      anomalies: [
        {
          targetType: 'PROJECT',
          targetId: 'project-1',
          name: '裝修',
          status: 'ZERO_ACTIVITY',
          activityCount: 0,
          activityAmount: 0,
        },
      ],
    } as never);
    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.COMPLETENESS_CHECK.evidence().zeroActivityNames).toEqual(['裝修']),
    );
    expect(result.current.COMPLETENESS_CHECK.evidence().kind).toBe('COMPLETENESS_ANOMALIES');
  });

  it('derives TRANSACTION_VALIDATION evidence from its own stage hook', async () => {
    vi.mocked(validateMonthTransactionsUseCase.execute).mockResolvedValue({
      yearMonth: '2026-08',
      checkedCount: 3,
      issues: [{ transactionId: 't1', description: '餐飲', reason: '分配總和不等於 100%' }],
    });
    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.TRANSACTION_VALIDATION.evidence().transactionIssues).toHaveLength(1),
    );
    expect(result.current.TRANSACTION_VALIDATION.evidence().kind).toBe('TRANSACTION_VALIDATION');
  });

  it("renders the five Step 9 financial figures from CLOSE_PERIOD's own bundle", async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({
        netIncome: 117_000,
        totalAssets: 10_500_000,
        totalLiabilities: 6_200_000,
        equity: 4_300_000,
        netCashChange: 179_000,
      }),
    );

    function ClosePeriodHarness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.CLOSE_PERIOD.render(baseContext)}</>;
    }

    render(<ClosePeriodHarness />);

    await waitFor(() => expect(screen.getByText('NT$10,500,000')).toBeInTheDocument());
    expect(screen.getByText('NT$6,200,000')).toBeInTheDocument();
    expect(screen.getByText('NT$4,300,000')).toBeInTheDocument();
    expect(screen.getByText('NT$117,000')).toBeInTheDocument();
    expect(screen.getByText('NT$179,000')).toBeInTheDocument();
  });

  it('annotates a Step 9 figure that drifted from the persisted report while live', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({
        netIncome: 117_000,
        totalAssets: 10_500_000,
        totalLiabilities: 6_200_000,
        equity: 4_300_000,
        netCashChange: 179_000,
      }),
    );
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue(
      persistedWithTotals({
        netIncome: 117_000,
        totalAssets: 10_500_000,
        totalLiabilities: 6_200_000,
        equity: 4_200_000,
        netCashChange: 179_000,
      }),
    );

    function ClosePeriodHarness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.CLOSE_PERIOD.render(baseContext)}</>;
    }

    render(<ClosePeriodHarness />);

    await waitFor(() =>
      expect(screen.getByText('NT$4,200,000 -> NT$4,300,000')).toBeInTheDocument(),
    );
  });

  it('renders the persisted Step 9 record with no drift marks for a CLOSED period', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({
        netIncome: 117_000,
        totalAssets: 10_500_000,
        totalLiabilities: 6_200_000,
        equity: 4_300_000,
        netCashChange: 179_000,
      }),
    );
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue(
      persistedWithTotals({
        netIncome: 117_000,
        totalAssets: 10_500_000,
        totalLiabilities: 6_200_000,
        equity: 4_200_000,
        netCashChange: 179_000,
      }),
    );

    const closedArgs: UseCloseStepRegistryArgs = {
      ...baseArgs,
      pageVM: { ...startedPageVM, isClosed: true },
    };
    function ClosedHarness() {
      const registry = useCloseStepRegistry(closedArgs);
      return <>{registry.CLOSE_PERIOD.render(baseContext)}</>;
    }

    render(<ClosedHarness />);

    await waitFor(() => expect(screen.getByText('NT$4,200,000')).toBeInTheDocument());
    expect(screen.queryByText(/->/)).not.toBeInTheDocument();
  });

  // T11 (#235): the page refreshes stages through `control.refresh` and never
  // asks which stage owns which data, so every stage that loads something must
  // expose it — and it must resolve even when the load fails, or `Promise.all`
  // in refreshAll would reject and skip the remaining stages.
  it('exposes a non-rejecting refresh on every load-bearing stage (#235)', async () => {
    const loadBearing = [
      'ACCOUNT_BALANCE',
      'SECURITIES_TRADE',
      'PORTFOLIO_CASH_FLOW',
      'PROJECT_SETTLEMENT',
      'DEBT_REPAYMENT',
      'TRANSACTION_VALIDATION',
      'COMPLETENESS_CHECK',
      'FINANCIAL_REPORTS',
    ] as const;
    vi.mocked(listProjectsUseCase.execute).mockRejectedValue(new Error('boom'));
    vi.mocked(validateMonthTransactionsUseCase.execute).mockRejectedValue(new Error('boom'));

    const { result } = renderRegistry();

    for (const stageId of loadBearing) {
      expect(typeof result.current[stageId].control.refresh).toBe('function');
    }
    await expect(
      Promise.all(loadBearing.map((stageId) => result.current[stageId].control.refresh?.())),
    ).resolves.toBeDefined();
  });

  it('adopts the confirm response rows into the SECURITIES_TRADE draft (#250)', async () => {
    const { result } = renderRegistry();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    const confirmedRow = {
      transactionId: 'tx-1',
      amount: 5000,
      date: new Date('2026-08-05'),
    };
    act(() => {
      result.current.SECURITIES_TRADE.control.afterConfirm({
        buys: [confirmedRow],
        sells: [],
        shareholderFinancing: [],
        dividendPayout: [],
      });
    });

    expect(result.current.SECURITIES_TRADE.control.buildRequest()).toEqual({
      stageId: 'SECURITIES_TRADE',
      securities: { buys: [confirmedRow], sells: [] },
      financing: { shareholderFinancing: [], dividendPayout: [] },
      removedTransactionIds: [],
    });
  });

  it('accepts an undefined confirm slice on a stage with nothing to adopt (#250)', async () => {
    const { result } = renderRegistry();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    const control = result.current.ACCOUNT_BALANCE.control;

    expect(() => control.afterConfirm(undefined)).not.toThrow();
    // Nothing was adopted, so the stage still submits its own empty draft.
    expect(control.buildRequest()).toEqual({ stageId: 'ACCOUNT_BALANCE', accountBalances: [] });
  });

  it('surfaces the ACCOUNT_BALANCE prefill failure without blocking confirm', async () => {
    vi.mocked(getAccountSnapshotsUseCase.execute).mockRejectedValue(new Error('boom'));
    const args: UseCloseStepRegistryArgs = { ...baseArgs, accounts: [account('acc-1')] };

    function Harness() {
      const registry = useCloseStepRegistry(args);
      return <>{registry.ACCOUNT_BALANCE.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入帳戶快照，請稍後再試。'),
    );
    // Prefill is a convenience: a hand-typed draft still submits.
    expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeEnabled();
  });

  it('surfaces the SECURITIES_TRADE prefill failure', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockRejectedValue(new Error('boom'));

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.SECURITIES_TRADE.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        '無法載入本月投資與融資交易，請稍後再試。',
      ),
    );
  });

  it('surfaces the PORTFOLIO_CASH_FLOW prefill failure', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockRejectedValue(new Error('boom'));
    const args: UseCloseStepRegistryArgs = {
      ...baseArgs,
      portfolios: [{ id: 'p-1', name: '長期持倉' }] as never,
    };

    function Harness() {
      const registry = useCloseStepRegistry(args);
      return <>{registry.PORTFOLIO_CASH_FLOW.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入 Portfolio 金流，請稍後再試。'),
    );
  });

  it('surfaces the PROJECT_SETTLEMENT failure', async () => {
    vi.mocked(listProjectsUseCase.execute).mockRejectedValue(new Error('boom'));

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.PROJECT_SETTLEMENT.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入專案結算狀態，請稍後再試。'),
    );
  });

  it('surfaces the DEBT_REPAYMENT prefill failure', async () => {
    vi.mocked(previewDebtSettlementsUseCase.execute).mockRejectedValue(new Error('boom'));
    const args: UseCloseStepRegistryArgs = {
      ...baseArgs,
      debtAccounts: [{ id: 'debt-1' }] as never,
    };

    function Harness() {
      const registry = useCloseStepRegistry(args);
      return <>{registry.DEBT_REPAYMENT.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('無法載入債務還款試算，請稍後再試。'),
    );
  });

  // #234: the close gate reads Step 8's own drift tree — a drifted child under a
  // matching total still blocks. It states *that* the reports drifted and never
  // names a count (see `hasReportDrift`), so the block and the warnings the user
  // saw cannot disagree.
  it('blocks the close when Step 8 drifted, without naming a count', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({ netIncome: 117_000 }),
    );
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue(
      persistedWithTotals({ netIncome: 100_000 }),
    );

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.CLOSE_PERIOD.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId('close-drift-block')).toHaveTextContent(
        '步驟 8 的報表與已產生報表不一致',
      ),
    );
    expect(screen.getByTestId('close-drift-block')).not.toHaveTextContent('項漂移');
    expect(screen.getByTestId('close-period-confirm')).toBeDisabled();
  });

  it('leaves the close reachable when the preview matches the persisted report', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({ netIncome: 117_000 }),
    );
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue(
      persistedWithTotals({ netIncome: 117_000 }),
    );

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.CLOSE_PERIOD.render(baseContext)}</>;
    }

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('close-period-confirm')).toBeEnabled());
    expect(screen.queryByTestId('close-drift-block')).not.toBeInTheDocument();
  });

  it('sends the user to Step 8 from the drift block', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(
      previewWithTotals({ netIncome: 117_000 }),
    );
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue(
      persistedWithTotals({ netIncome: 100_000 }),
    );
    const onGoToStage = vi.fn();

    function Harness() {
      const registry = useCloseStepRegistry(baseArgs);
      return <>{registry.CLOSE_PERIOD.render({ ...baseContext, onGoToStage })}</>;
    }

    render(<Harness />);

    fireEvent.click(await screen.findByTestId('review-reports'));

    expect(onGoToStage).toHaveBeenCalledWith('FINANCIAL_REPORTS');
  });
});
