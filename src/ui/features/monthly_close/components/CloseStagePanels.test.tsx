import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type CloseSummaryVM, type ReadinessVM } from '../mappers/closeSummary.mappers';
import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';
import { CloseStageEvidenceList } from './CloseStageEvidenceList';
import { CloseStagePanels } from './CloseStagePanels';

const { useCloseFinancialReportsMock } = vi.hoisted(() => ({
  useCloseFinancialReportsMock: vi.fn(),
}));

vi.mock('../hooks/useCloseFinancialReports', () => ({
  useCloseFinancialReports: useCloseFinancialReportsMock,
  default: useCloseFinancialReportsMock,
}));

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

useCloseFinancialReportsMock.mockReturnValue({
  view: 'INCOME_STATEMENT',
  setView: () => undefined,
  incomeStatement: null,
  balanceSheet: null,
  cashFlow: null,
  timestamps: {},
  missingCategoryNames: [],
  isLoading: false,
  error: null,
});

const stageVM = (stageId: CloseStageItemVM['stageId']): CloseStageItemVM => ({
  stageId,
  label: stageId,
  status: 'PENDING',
  isCompleted: false,
  isReviewSource: false,
  isStale: false,
  confirmedByText: null,
  confirmedAtText: null,
});

const readinessVM: ReadinessVM = { isReady: true, checks: [], exceptions: [] };

const closeSummaryVM: CloseSummaryVM = {
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

const renderPanels = (
  displayedStageId: string,
  overrides?: Partial<Parameters<typeof CloseStagePanels>[0]>,
) =>
  render(
    <CloseStagePanels
      displayedStageId={displayedStageId}
      householdId="household-1"
      selectedYearMonth="2026-08"
      confirmingStageId={null}
      readinessVM={null}
      closeSummaryVM={null}
      reportsPersisted={false}
      stage={stageVM(displayedStageId as CloseStageItemVM['stageId'])}
      stepText={displayedStageId}
      isReviewing={false}
      progressText="07 / 09"
      isClosed={false}
      evidence={<div />}
      accounts={[]}
      accountSnapshots={new Map()}
      portfolioSnapshots={new Map()}
      portfolios={[]}
      debtSectionMetas={[]}
      accountBalances={[]}
      setAccountBalances={() => undefined}
      securities={{ buys: [], sells: [] }}
      financing={{ shareholderFinancing: [], dividendPayout: [] }}
      portfolioCashFlows={{}}
      setPortfolioCashFlows={() => undefined}
      repayments={[]}
      setRepayments={() => undefined}
      onContinue={() => undefined}
      onGenerate={() => undefined}
      onBack={() => undefined}
      onConfirmStage={() => undefined}
      onGoToStage={() => undefined}
      onClosePeriod={() => undefined}
      {...overrides}
    />,
  );

describe('CloseStagePanels', () => {
  it('dispatches COMPLETENESS_CHECK to the readiness check even with a pipeline stage', () => {
    renderPanels('COMPLETENESS_CHECK', { readinessVM });

    expect(screen.getByTestId('close-readiness-check')).toBeInTheDocument();
  });

  it('dispatches CLOSE_PERIOD to the summary panel even with a pipeline stage', () => {
    renderPanels('CLOSE_PERIOD', { closeSummaryVM });

    expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
  });

  it('dispatches FINANCIAL_REPORTS to the reports panel even with a pipeline stage', () => {
    renderPanels('FINANCIAL_REPORTS');

    expect(screen.getAllByText(MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE).length).toBe(2);
  });

  it('renders the workspace frame for a stage with inputs', () => {
    renderPanels('ACCOUNT_BALANCE');

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
  });

  it('renders per-project settlement rows for the PROJECT_SETTLEMENT evidence', () => {
    render(
      <CloseStageEvidenceList
        evidence={{
          kind: 'PROJECT_SETTLEMENT',
          transactionIssues: [],
          zeroActivityNames: [],
          cashFlowAdjustments: 0,
          reportsPersisted: null,
          projectSettlements: [
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
        }}
      />,
    );

    expect(screen.getByText('裝修')).toBeInTheDocument();
    expect(screen.getByText('旅遊')).toBeInTheDocument();
    expect(screen.getByText(MONTHLY_CLOSE_LABELS.UNSETTLED)).toBeInTheDocument();
    expect(screen.queryByText(MONTHLY_CLOSE_LABELS.NO_PROJECTS)).not.toBeInTheDocument();
  });

  it('renders nothing for COMPLETENESS_CHECK while readiness is missing', () => {
    const { container } = renderPanels('COMPLETENESS_CHECK', { readinessVM: null });

    expect(container).toBeEmptyDOMElement();
  });

  it('wires the securities trade tables to open the drawer on add and row click', () => {
    const onOpenTradeDrawer = vi.fn();
    renderPanels('SECURITIES_TRADE', {
      onOpenTradeDrawer,
      securities: {
        buys: [
          {
            transactionId: 'tx-1',
            amount: 1200,
            date: new Date('2026-08-05'),
            description: '買入標的',
            projectId: null,
          },
        ],
        sells: [],
      },
    });

    fireEvent.click(screen.getAllByRole('button', { name: '新增交易' })[0]);
    expect(onOpenTradeDrawer).toHaveBeenCalledWith('SECURITIES');

    fireEvent.click(screen.getAllByText('買入標的')[0]);
    expect(onOpenTradeDrawer).toHaveBeenNthCalledWith(
      2,
      'SECURITIES',
      expect.objectContaining({ transactionId: 'tx-1' }),
    );
  });
});
