import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { MonthlyClosePage } from './MonthlyClosePage';

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => ({ uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false }),
}));

vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn().mockResolvedValue(closedPeriod()),
    reopen: vi.fn(),
    confirmStage: vi.fn(),
    resetStagesFrom: vi.fn(),
  },
}));

vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn().mockResolvedValue([]) },
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
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', activities: [], anomalies: [] }),
  },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: true, timestamps: {} }),
  },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: {
    execute: vi.fn().mockResolvedValue({
      year: 2026,
      month: 9,
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
    }),
  },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: {
    execute: vi.fn().mockResolvedValue({
      incomeStatement: {
        yearMonth: '2026-09',
        incomeTotal: 0,
        expenseTotal: 0,
        netIncome: 0,
        incomeItems: [],
        expenseItems: [],
      },
      balanceSheet: {
        yearMonth: '2026-09',
        assets: { total: 0, groups: {} },
        liabilities: { total: 0, groups: {} },
        equity: { total: 0, groups: {} },
      },
      cashFlow: {
        yearMonth: '2026-09',
        operating: { label: 'operating', total: 0, inflowItems: [], outflowItems: [] },
        investing: { label: 'investing', total: 0, inflowItems: [], outflowItems: [] },
        financing: { label: 'financing', total: 0, inflowItems: [], outflowItems: [] },
        netCashChange: 0,
        beginningBalance: 0,
        endingBalance: 0,
        actualBalance: 0,
        adjustment: 0,
      },
      isPersisted: true,
      timestamps: {},
    }),
  },
}));
vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
}));

function closedPeriod(): FinancialPeriod {
  const stages = initialStageStates();
  for (const stageId of Object.keys(stages)) {
    stages[stageId] = {
      status: 'COMPLETED',
      confirmedAt: new Date('2026-09-20T10:00:00Z'),
      confirmedBy: 'user@test.com',
    };
  }
  return {
    id: '2026-09',
    yearMonth: '2026-09',
    status: 'CLOSED',
    stages,
    reviewSourceStageId: null,
    createdBy: 'user@test.com',
    createdAt: new Date(),
    updatedBy: 'user@test.com',
    updatedAt: new Date(),
  };
}

function cascadeDemotedPeriod(): FinancialPeriod {
  return {
    ...closedPeriod(),
    status: 'NEEDS_REVIEW',
    reviewSourceStageId: null,
    stages: initialStageStates(),
  };
}

describe('MonthlyClosePage (closed period)', () => {
  it('renders the read-only Step 9 close summary as the default view', async () => {
    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);

    const startButton = screen.getByRole('button', { name: '開始關帳' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('close-summary-panel')).toBeInTheDocument();
    });

    expect(screen.getByText('關帳總結')).toBeInTheDocument();
    expect(screen.queryByTestId('close-period-confirm')).not.toBeInTheDocument();
    expect(screen.getByText('本期已完成關帳')).toBeInTheDocument();
  });
});

describe('MonthlyClosePage (cascade-demoted period)', () => {
  it('keeps the recovery walk confirm button reachable (ADR-0066)', async () => {
    vi.mocked(
      (await import('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase'))
        .monthlyCloseWorkflowUseCase.start,
    ).mockResolvedValueOnce(cascadeDemotedPeriod());

    render(<MonthlyClosePage householdId="household-1" userEmail="user@test.com" />);

    fireEvent.click(screen.getByRole('button', { name: '開始關帳' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONTINUE →' })).toBeInTheDocument();
    });
  });
});
