import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { useMonthlyClosePage } from './useMonthlyClosePage';

// Issue #250: the confirm's response is authoritative — the page hands the
// returned slice back to the stage that produced it, that stage adopts the rows
// as its draft, and a later re-read of the month must not clobber them. This is
// observed through the real registry's own SECURITIES_TRADE content, so the
// whole chain (workflow result -> page dispatch -> stage `afterConfirm` ->
// `useSeededDraft` ownership) is what is under test, not a stubbed stage.

const { authIdentity, confirmMock } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
  confirmMock: vi.fn(),
}));

vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
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
vi.mock('@/application/settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', checkedCount: 0, issues: [] }),
  },
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: {
    execute: vi.fn().mockResolvedValue({ yearMonth: '2026-09', activities: [], anomalies: [] }),
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
const Harness = ({ holderRef }: { holderRef: PageHolder }) => {
  const current = useMonthlyClosePage({});
  useEffect(() => {
    holderRef.current = current;
  });
  return <div>{current.stepRegistry.SECURITIES_TRADE.render(current.stageContext)}</div>;
};

const startPage = async (holder: PageHolder) => {
  await act(async () => {
    await holder.current?.handleStart();
  });
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

  const renderPage = () => render(<Harness holderRef={holder} />);

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
    await startPage(holder);
    await expectRowShown('prefill-buy');

    await act(async () => {
      await holder.current?.handleConfirmStage('SECURITIES_TRADE');
    });

    // The write's rows, not the re-read ones: the refresh after confirm reloads
    // the prefill, and the adopted draft must survive it.
    expect(rowCount('confirmed-buy')).toBeGreaterThan(0);
    expect(rowCount('prefill-buy')).toBe(0);
    expect(getMonthInvestmentFinancingUseCase.execute.mock.calls.length).toBeGreaterThan(1);
  });

  it('leaves the draft untouched and dispatches no slice when the confirm fails', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.confirmStage).mockResolvedValue(null as never);

    renderPage();
    await startPage(holder);
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

    renderPage();
    await startPage(holder);
    await act(async () => {
      await holder.current?.handleConfirmStage('SECURITIES_TRADE');
    });
    expect(rowCount('confirmed-buy')).toBeGreaterThan(0);

    // The page's opening month comes from the clock, so the switch target is
    // derived from what is actually selected instead of assumed.
    const nextMonth = holder.current!.selectedYearMonth === '2026-11' ? '2026-12' : '2026-11';
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(
      monthTransactions(tradeRow('tx-october', 'october-buy', 500)) as never,
    );
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(inProgressPeriod(nextMonth));

    await act(async () => {
      holder.current?.selectYearMonth(nextMonth);
    });
    await act(async () => {
      await holder.current?.handleStart();
    });

    // Ownership is per key: the new month seeds from its own prefill.
    await expectRowShown('october-buy');
    expect(rowCount('confirmed-buy')).toBe(0);
  });
});
