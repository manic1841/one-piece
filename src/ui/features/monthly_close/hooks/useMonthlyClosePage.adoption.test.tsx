import { useEffect } from 'react';

import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'household-1', email: 'user@test.com' } }),
}));
vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn(),
    reopen: vi.fn(),
    confirmStage: vi.fn(),
    resetStagesFrom: vi.fn(),
  },
}));

vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'acc-1' }]) },
}));
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'p-1', name: '長期' }]) },
}));
vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: {
    execute: vi.fn().mockResolvedValue([{ id: 'proj-1', name: '裝修', isActive: true }]),
  },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn().mockResolvedValue([{ id: 'debt-1' }]) },
}));

vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase', () => ({
  getMonthInvestmentFinancingUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/previewProjectSettlementsUseCase', () => ({
  previewProjectSettlementsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
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
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: false, timestamps: {} }),
  },
}));

const readinessFixture = {
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
};

const inProgressPeriod = (yearMonth = '2026-09'): FinancialPeriod => ({
  id: yearMonth,
  yearMonth,
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  reviewSourceStageId: null,
  createdBy: 'user@test.com',
  createdAt: new Date(),
  updatedBy: 'user@test.com',
  updatedAt: new Date(),
});

const tradeRow = (transactionId: string, description: string, amount: number) => ({
  transactionId,
  amount,
  date: new Date('2026-09-05'),
  description,
});

const monthTransactions = (buy: ReturnType<typeof tradeRow> | null) => ({
  buys: buy ? [buy] : [],
  sells: [],
  shareholderFinancing: [],
  dividendPayout: [],
});

type Page = ReturnType<typeof useMonthlyClosePage>;

type PageHolder = { current: Page | null };

/** The tables render a desktop and a mobile copy, so row text appears twice. */
const rowCount = (description: string) => screen.queryAllByText(description).length;

const expectRowShown = async (description: string) => {
  await waitFor(() => expect(rowCount(description)).toBeGreaterThan(0));
};

/** Renders the real registry's SECURITIES_TRADE content from the real page hook. */
const Harness = ({ holderRef, yearMonth }: { holderRef: PageHolder; yearMonth: string }) => {
  const current = useMonthlyClosePage({
    householdId: 'household-1',
    userEmail: 'user@test.com',
    yearMonth,
    initialPeriod: inProgressPeriod(yearMonth),
  });
  useEffect(() => {
    holderRef.current = current;
  });
  return <div>{current.stepRegistry.SECURITIES_TRADE.render(current.stageContext)}</div>;
};

const expectWorkspaceLoaded = async () => {
  await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());
};

describe('useMonthlyClosePage confirm adoption (#250)', () => {
  const holder: PageHolder = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();
    holder.current = null;
    confirmMock.mockResolvedValue(false);
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readinessFixture as never);
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(inProgressPeriod() as never);
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(
      monthTransactions(tradeRow('tx-prefill', 'prefill-buy', 1000)) as never,
    );
  });

  const renderPage = () => render(<Harness holderRef={holder} yearMonth="2026-09" />);

  it('adopts the confirm response rows into the stage draft', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue({
      stageId: 'SECURITIES_TRADE',
      period: inProgressPeriod(),
      data: {
        buys: [tradeRow('tx-confirmed', 'confirmed-buy', 9000)],
        sells: [],
        shareholderFinancing: [],
        dividendPayout: [],
      },
    } as never);

    renderPage();
    await expectWorkspaceLoaded();
    await expectRowShown('prefill-buy');

    await act(async () => {
      await holder.current?.handleConfirmStage('SECURITIES_TRADE');
    });

    // The adopted draft merges onto the prefilled draft: the untouched prefill row
    // survives the post-confirm refresh's re-read, and the confirmed row is appended.
    expect(rowCount('confirmed-buy')).toBeGreaterThan(0);
    expect(rowCount('prefill-buy')).toBeGreaterThan(0);
    expect(getMonthInvestmentFinancingUseCase.execute.mock.calls.length).toBeGreaterThan(1);
  });

  it('leaves the draft untouched and dispatches no slice when the confirm fails', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue(null as never);

    renderPage();
    await expectWorkspaceLoaded();
    await expectRowShown('prefill-buy');

    const control = holder.current!.stepRegistry.SECURITIES_TRADE.control;
    const afterConfirmSpy = vi.spyOn(control, 'afterConfirm');
    const readsBefore = getMonthInvestmentFinancingUseCase.execute.mock.calls.length;

    await act(async () => {
      await holder.current?.handleConfirmStage('SECURITIES_TRADE');
    });

    expect(monthlyCloseWorkflowUseCase.confirmStage).toHaveBeenCalled();
    expect(afterConfirmSpy).not.toHaveBeenCalled();
    // No failure writes and no post-confirm refresh.
    expect(rowCount('prefill-buy')).toBeGreaterThan(0);
    expect(getMonthInvestmentFinancingUseCase.execute.mock.calls.length).toBe(readsBefore);
  });

  it('retires the adopted draft when the month changes', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue({
      stageId: 'SECURITIES_TRADE',
      period: inProgressPeriod(),
      data: {
        buys: [tradeRow('tx-confirmed', 'confirmed-buy', 9000)],
        sells: [],
        shareholderFinancing: [],
        dividendPayout: [],
      },
    } as never);

    const september = renderPage();
    await expectWorkspaceLoaded();
    await expectRowShown('prefill-buy');
    await act(async () => {
      await holder.current?.handleConfirmStage('SECURITIES_TRADE');
    });
    await expectRowShown('confirmed-buy');
    expect(rowCount('prefill-buy')).toBeGreaterThan(0);

    // A new month is a new mount, so the previous month's adopted draft is gone.
    september.unmount();
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(
      monthTransactions(tradeRow('tx-october', 'october-buy', 500)) as never,
    );
    render(<Harness holderRef={holder} yearMonth="2026-10" />);

    await expectRowShown('october-buy');
    expect(rowCount('confirmed-buy')).toBe(0);
  });
});
