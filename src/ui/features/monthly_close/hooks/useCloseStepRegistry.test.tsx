import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { mapPeriodToPageVM } from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';

import {
  type CloseStepContext,
  type UseCloseStepRegistryArgs,
  useCloseStepRegistry,
} from './useCloseStepRegistry';

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => ({ uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false }),
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
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn().mockResolvedValue(null) },
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
  projects: [],
};

const readinessFixture: NonNullable<UseCloseStepRegistryArgs['readiness']> = {
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

const baseArgs: UseCloseStepRegistryArgs = {
  householdId: 'household-1',
  selectedYearMonth: '2026-08',
  confirmingStageId: null,
  refreshKey: 0,
  accounts: [],
  portfolios: [],
  debtAccounts: [],
  evidenceInputs: { anomalies: [], transactionIssues: [] },
  readiness: null,
  pageVM: mapPeriodToPageVM(null, '2026-08'),
  refreshStageEvidence: vi.fn().mockResolvedValue(undefined),
};

const renderRegistry = (overrides: Partial<UseCloseStepRegistryArgs> = {}) =>
  renderHook(() => useCloseStepRegistry({ ...baseArgs, ...overrides }));

const previewFixture = (adjustment: number) =>
  ({
    incomeStatement: { netIncome: 0 },
    balanceSheet: {
      assets: { total: 0 },
      liabilities: { total: 0 },
      equity: { total: 0 },
    },
    cashFlow: { adjustment, netCashChange: 0 },
  }) as never;

describe('useCloseStepRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('dispatches COMPLETENESS_CHECK to the readiness check via the content factory', () => {
    const { result } = renderRegistry({ readiness: readinessFixture });

    render(<>{result.current.COMPLETENESS_CHECK.render(baseContext)}</>);

    expect(screen.getByTestId('close-readiness-check')).toBeInTheDocument();
  });

  it('renders nothing for COMPLETENESS_CHECK while readiness is missing', () => {
    const { result } = renderRegistry();

    const { container } = render(<>{result.current.COMPLETENESS_CHECK.render(baseContext)}</>);

    expect(container).toBeEmptyDOMElement();
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

  it('derives FINANCIAL_REPORTS evidence from the stage preview bundle', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(1500));
    const { result } = renderRegistry();

    await waitFor(() =>
      expect(result.current.FINANCIAL_REPORTS.evidence().kind).toBe('CASH_FLOW_ADJUSTMENTS'),
    );
    expect(result.current.FINANCIAL_REPORTS.evidence().cashFlowAdjustments).toBe(1500);
  });

  it('resets every stage draft through the control record', () => {
    const { result } = renderRegistry();

    for (const step of Object.values(result.current)) {
      expect(typeof step.control.resetDraft).toBe('function');
      step.control.resetDraft();
    }
  });
});
