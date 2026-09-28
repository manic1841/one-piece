import { fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type CloseStepContext, useCloseStepRegistry } from './useCloseStepRegistry';

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
vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

const baseContext: CloseStepContext = {
  householdId: 'household-1',
  selectedYearMonth: '2026-08',
  confirming: false,
  isConfirmable: true,
  confirmedAtText: null,
  isReviewing: false,
  progressText: '01 / 09',
  stepText: 'ACCOUNT_BALANCE',
  readinessVM: null,
  closeSummaryVM: null,
  accounts: [],
  accountSnapshots: new Map(),
  portfolioSnapshots: new Map(),
  portfolios: [],
  projects: [],
  debtSectionMetas: [],
  accountBalances: [],
  setAccountBalances: vi.fn(),
  securities: { buys: [], sells: [] },
  financing: { shareholderFinancing: [], dividendPayout: [] },
  portfolioCashFlows: {},
  setPortfolioCashFlows: vi.fn(),
  repayments: [],
  setRepayments: vi.fn(),
  onConfirm: vi.fn(),
  onGoToStage: vi.fn(),
  onConfirmStage: vi.fn(),
  onClosePeriod: vi.fn(),
  onContinue: vi.fn(),
  onGenerate: vi.fn(),
  onBack: vi.fn(),
  onOpenTradeDrawer: vi.fn(),
};

const readinessVM = {
  isReady: true,
  checks: [],
  exceptions: [],
};

const closeSummaryVM = {
  activity: [],
  financial: {
    totalAssets: 1,
    totalLiabilities: 0,
    equity: 1,
    netIncome: 0,
    netCashFlow: 0,
  },
  reports: [],
  reportsGeneratedCount: 0,
};

const noEvidence = {
  kind: 'NONE' as const,
  transactionIssues: [],
  zeroActivityNames: [],
  cashFlowAdjustments: 0,
  reportsPersisted: null,
  projectSettlements: [],
};

const renderRegistry = () =>
  renderHook(() =>
    useCloseStepRegistry({
      householdId: 'household-1',
      selectedYearMonth: '2026-08',
      confirmingStageId: null,
      stageRefreshKey: 0,
      accounts: [],
      portfolios: [],
      debtAccounts: [],
    }),
  );

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
    const { result } = renderRegistry();

    render(
      <>{result.current.COMPLETENESS_CHECK.render({ ...baseContext, readinessVM }, noEvidence)}</>,
    );

    expect(screen.getByTestId('close-readiness-check')).toBeInTheDocument();
  });

  it('renders nothing for COMPLETENESS_CHECK while readiness is missing', () => {
    const { result } = renderRegistry();

    const { container } = render(
      <>{result.current.COMPLETENESS_CHECK.render(baseContext, noEvidence)}</>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('dispatches CLOSE_PERIOD to the summary panel via the content factory', () => {
    const { result } = renderRegistry();

    render(
      <>{result.current.CLOSE_PERIOD.render({ ...baseContext, closeSummaryVM }, noEvidence)}</>,
    );

    expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
  });

  it('dispatches FINANCIAL_REPORTS to the reports panel via the content factory', () => {
    const { result } = renderRegistry();

    render(<>{result.current.FINANCIAL_REPORTS.render(baseContext, noEvidence)}</>);

    expect(screen.getAllByText(MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE).length).toBe(2);
  });

  it('renders the shared chrome frame for a stage with inputs', () => {
    const { result } = renderRegistry();

    render(<>{result.current.ACCOUNT_BALANCE.render(baseContext, noEvidence)}</>);

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
  });

  it('builds per-project settlement evidence and renders its rows', () => {
    const { result } = renderRegistry();

    const evidence = result.current.PROJECT_SETTLEMENT.evidence(
      { anomalies: [], transactionIssues: [], cashFlowAdjustment: null, reportsPersisted: null },
      [
        {
          projectId: 'project-1',
          projectName: '裝修',
          settled: true,
          income: 5000,
          expense: 3000,
          closingBalance: 2000,
        },
        {
          projectId: 'project-2',
          projectName: '旅遊',
          settled: false,
          income: null,
          expense: null,
          closingBalance: null,
        },
      ],
    );

    render(<>{result.current.PROJECT_SETTLEMENT.render(baseContext, evidence)}</>);

    expect(screen.getByText('裝修')).toBeInTheDocument();
    expect(screen.getByText('旅遊')).toBeInTheDocument();
    expect(screen.getByText(MONTHLY_CLOSE_LABELS.UNSETTLED)).toBeInTheDocument();
  });

  it('wires the securities trade stage to open the drawer through the context', () => {
    const onOpenTradeDrawer = vi.fn();
    const { result } = renderRegistry();

    render(
      <>
        {result.current.SECURITIES_TRADE.render({ ...baseContext, onOpenTradeDrawer }, noEvidence)}
      </>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: '新增交易' })[0]);
    expect(onOpenTradeDrawer).toHaveBeenCalledWith('SECURITIES');
  });

  it('resets every stage draft through the control record', () => {
    const { result } = renderRegistry();

    for (const step of Object.values(result.current)) {
      expect(typeof step.control.resetDraft).toBe('function');
      step.control.resetDraft();
    }
  });
});
