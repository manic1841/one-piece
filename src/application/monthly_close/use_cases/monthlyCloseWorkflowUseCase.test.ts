import { beforeEach, describe, expect, it, vi } from 'vitest';

import { batchRecordSnapshotsUseCase } from '@/application/account/use_cases/batchRecordSnapshotsUseCase';
import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { deleteTransactionUseCase } from '@/application/ledger/use_cases/deleteTransactionUseCase';
import { updateTransactionUseCase } from '@/application/ledger/use_cases/updateTransactionUseCase';
import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import {
  getFinancialPeriodUseCase,
  listFinancialPeriodsUseCase,
  saveFinancialPeriodUseCase,
} from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { MonthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { createPortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/createPortfolioSnapshotUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';
import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { type AuthContext } from '@/application/types';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

vi.mock('@/application/account/use_cases/batchRecordSnapshotsUseCase');
vi.mock('@/application/debt/use_cases/createDebtPaymentUseCase');
vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/application/ledger/use_cases/createTransactionUseCase');
vi.mock('@/application/ledger/use_cases/deleteTransactionUseCase');
vi.mock('@/application/ledger/use_cases/updateTransactionUseCase');
vi.mock('@/application/portfolio/use_cases/createPortfolioSnapshotUseCase');
vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase');
vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase');
vi.mock('@/application/report/use_cases/generateFinancialReportsUseCase');
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase');
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase');
vi.mock('@/application/settlement/use_cases/settleDebtAccountsUseCase');
vi.mock('@/application/settlement/use_cases/settleProjectsUseCase');
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase');
vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => {
  const getFinancialPeriodUseCase = { execute: vi.fn() };
  const saveFinancialPeriodUseCase = {
    execute: vi.fn().mockResolvedValue(undefined),
    saveAll: vi.fn().mockResolvedValue(undefined),
  };
  const listFinancialPeriodsUseCase = { execute: vi.fn().mockResolvedValue([]) };
  return {
    GetFinancialPeriodUseCase: vi.fn().mockImplementation(function () {
      return getFinancialPeriodUseCase;
    }),
    SaveFinancialPeriodUseCase: vi.fn().mockImplementation(function () {
      return saveFinancialPeriodUseCase;
    }),
    ListFinancialPeriodsUseCase: vi.fn().mockImplementation(function () {
      return listFinancialPeriodsUseCase;
    }),
    getFinancialPeriodUseCase,
    saveFinancialPeriodUseCase,
    listFinancialPeriodsUseCase,
  };
});

vi.mocked(getFinancialPeriodUseCase.execute).mockReset();
vi.mocked(saveFinancialPeriodUseCase.execute).mockClear();

const auth: AuthContext = { uid: 'user-1', email: 'user@test.com' };
const REQUEST_BASE = {
  householdId: 'household-1',
  yearMonth: '2026-09',
  userEmail: 'user@test.com',
  auth,
};

function basePeriod(overrides: Partial<FinancialPeriod> = {}): FinancialPeriod {
  return {
    yearMonth: '2026-09',
    status: 'IN_PROGRESS',
    stages: initialStageStates(),
    reviewSourceStageId: null,
    id: '2026-09',
    createdBy: 'user@test.com',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedBy: 'user@test.com',
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

function completeStage(period: FinancialPeriod, stageId: keyof FinancialPeriod['stages']) {
  period.stages[stageId] = {
    status: 'COMPLETED',
    confirmedBy: 'user@test.com',
    confirmedAt: new Date(),
  };
  return period;
}

describe('MonthlyCloseWorkflowUseCase.start', () => {
  let useCase: MonthlyCloseWorkflowUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveFinancialPeriodUseCase.execute).mockResolvedValue(undefined);
  });

  it('creates a period with initial stage states', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(null);
    useCase = new MonthlyCloseWorkflowUseCase();

    const period = await useCase.start(REQUEST_BASE);

    expect(period.status).toBe('IN_PROGRESS');
    expect(period.reviewSourceStageId).toBeNull();
    expect(saveFinancialPeriodUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      period: expect.objectContaining({ yearMonth: '2026-09', status: 'IN_PROGRESS' }),
      userEmail: 'user@test.com',
    });
  });

  it('returns the existing period when one is already present', async () => {
    const existing = basePeriod();
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(existing);
    useCase = new MonthlyCloseWorkflowUseCase();

    const period = await useCase.start(REQUEST_BASE);

    expect(period).toBe(existing);
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });
});

describe('MonthlyCloseWorkflowUseCase.reopen', () => {
  let useCase: MonthlyCloseWorkflowUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveFinancialPeriodUseCase.execute).mockResolvedValue(undefined);
    useCase = new MonthlyCloseWorkflowUseCase();
  });

  it('reopens a closed period and resets Financial Reports and Close Period', async () => {
    const closed = completeStage(basePeriod({ status: 'CLOSED' }), 'CLOSE_PERIOD');
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(closed);
    vi.mocked(listFinancialPeriodsUseCase.execute).mockResolvedValue([]);

    const reopened = await useCase.reopen(REQUEST_BASE);

    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.reviewSourceStageId).toBeNull();
    expect(reopened.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(reopened.stages.CLOSE_PERIOD?.status).toBe('PENDING');
    expect(reopened.stages.ACCOUNT_BALANCE?.status).toBe('PENDING');
    expect(saveFinancialPeriodUseCase.saveAll).toHaveBeenCalledWith(
      expect.objectContaining({
        periods: [expect.objectContaining({ status: 'IN_PROGRESS' })],
      }),
    );
  });

  it('keeps earlier completed stages and only resets the last two', async () => {
    let period = basePeriod({ status: 'CLOSED' });
    for (const stageId of [
      'ACCOUNT_BALANCE',
      'TRANSACTION_VALIDATION',
      'DEBT_REPAYMENT',
      'FINANCIAL_REPORTS',
      'CLOSE_PERIOD',
    ] as const) {
      period = completeStage(period, stageId);
    }
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(period);
    vi.mocked(listFinancialPeriodsUseCase.execute).mockResolvedValue([]);

    const reopened = await useCase.reopen(REQUEST_BASE);

    expect(reopened.stages.ACCOUNT_BALANCE?.status).toBe('COMPLETED');
    expect(reopened.stages.TRANSACTION_VALIDATION?.status).toBe('COMPLETED');
    expect(reopened.stages.DEBT_REPAYMENT?.status).toBe('COMPLETED');
    expect(reopened.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(reopened.stages.CLOSE_PERIOD?.status).toBe('PENDING');
  });

  it('demotes later CLOSED periods to NEEDS_REVIEW with null review source', async () => {
    const closed = completeStage(basePeriod({ status: 'CLOSED' }), 'CLOSE_PERIOD');
    const laterClosed = completeStage(
      basePeriod({ status: 'CLOSED', yearMonth: '2026-10', id: '2026-10' }),
      'CLOSE_PERIOD',
    );
    const laterOpen = basePeriod({ yearMonth: '2026-11', id: '2026-11' });
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(closed);
    vi.mocked(listFinancialPeriodsUseCase.execute).mockResolvedValue([laterOpen, laterClosed]);

    await useCase.reopen(REQUEST_BASE);

    expect(saveFinancialPeriodUseCase.saveAll).toHaveBeenCalledTimes(1);
    expect(saveFinancialPeriodUseCase.saveAll).toHaveBeenCalledWith({
      householdId: 'household-1',
      periods: [
        expect.objectContaining({ status: 'IN_PROGRESS' }),
        expect.objectContaining({
          yearMonth: '2026-10',
          status: 'NEEDS_REVIEW',
          reviewSourceStageId: null,
        }),
      ],
      userEmail: 'user@test.com',
    });
  });

  it('does not demote cascade-demoted or in-progress periods', async () => {
    const closed = completeStage(basePeriod({ status: 'CLOSED' }), 'CLOSE_PERIOD');
    const cascadeDemoted = basePeriod({
      status: 'NEEDS_REVIEW',
      yearMonth: '2026-10',
      id: '2026-10',
      reviewSourceStageId: null,
    });
    const inProgress = basePeriod({ yearMonth: '2026-11', id: '2026-11' });
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(closed);
    vi.mocked(listFinancialPeriodsUseCase.execute).mockResolvedValue([cascadeDemoted, inProgress]);

    await useCase.reopen(REQUEST_BASE);

    expect(saveFinancialPeriodUseCase.saveAll).toHaveBeenCalledWith({
      householdId: 'household-1',
      periods: [expect.objectContaining({ status: 'IN_PROGRESS' })],
      userEmail: 'user@test.com',
    });
  });

  it('reopens a cascade-demoted period through the same recovery path', async () => {
    const demoted = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: null,
      stages: {
        ...initialStageStates(),
        ACCOUNT_BALANCE: {
          status: 'COMPLETED',
          confirmedBy: 'user@test.com',
          confirmedAt: new Date(),
        },
        FINANCIAL_REPORTS: {
          status: 'COMPLETED',
          confirmedBy: 'user@test.com',
          confirmedAt: new Date(),
        },
        CLOSE_PERIOD: {
          status: 'COMPLETED',
          confirmedBy: 'user@test.com',
          confirmedAt: new Date(),
        },
      },
    });
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(demoted);
    vi.mocked(listFinancialPeriodsUseCase.execute).mockResolvedValue([]);

    const reopened = await useCase.reopen(REQUEST_BASE);

    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(reopened.stages.CLOSE_PERIOD?.status).toBe('PENDING');
    expect(reopened.stages.ACCOUNT_BALANCE?.status).toBe('COMPLETED');
  });

  it('rejects reopening a period that has not started', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(null);

    await expect(useCase.reopen(REQUEST_BASE)).rejects.toMatchObject({
      code: MonthlyCloseCommandErrorCode.PERIOD_NOT_STARTED,
    });
  });

  it('rejects reopening an in-progress period', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(basePeriod());

    await expect(useCase.reopen(REQUEST_BASE)).rejects.toMatchObject({
      code: MonthlyCloseCommandErrorCode.PERIOD_NOT_REOPENABLE,
    });
  });
});

describe('MonthlyCloseWorkflowUseCase.confirmStage', () => {
  let useCase: MonthlyCloseWorkflowUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveFinancialPeriodUseCase.execute).mockResolvedValue(undefined);
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(basePeriod());
    useCase = new MonthlyCloseWorkflowUseCase();
  });

  it('creates account snapshots from submitted balances and completes the stage', async () => {
    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'ACCOUNT_BALANCE',
      accountBalances: [{ accountId: 'account-1', amount: 1000 }],
    });

    expect(batchRecordSnapshotsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      snapshots: [
        {
          accountId: 'account-1',
          data: { accountId: 'account-1', year: 2026, month: 9, amount: 1000 },
        },
      ],
      userEmail: 'user@test.com',
      auth,
    });
    expect(saveFinancialPeriodUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        period: expect.objectContaining({
          stages: expect.objectContaining({
            ACCOUNT_BALANCE: expect.objectContaining({ status: 'COMPLETED' }),
          }),
        }),
      }),
    );
  });

  it('passes foreign-currency details and holdings into the snapshots', async () => {
    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'ACCOUNT_BALANCE',
      accountBalances: [
        {
          accountId: 'account-usd',
          amount: 375000,
          originalAmount: 12000,
          exchangeRate: 31.25,
        },
        {
          accountId: 'account-sec',
          amount: 1680000,
          holdings: [
            { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
          ],
        },
      ],
    });

    expect(batchRecordSnapshotsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      snapshots: [
        {
          accountId: 'account-usd',
          data: {
            accountId: 'account-usd',
            year: 2026,
            month: 9,
            amount: 375000,
            originalAmount: 12000,
            exchangeRate: 31.25,
          },
        },
        {
          accountId: 'account-sec',
          data: {
            accountId: 'account-sec',
            year: 2026,
            month: 9,
            amount: 1680000,
            holdings: [
              { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
            ],
          },
        },
      ],
      userEmail: 'user@test.com',
      auth,
    });
  });

  it('rejects account balance confirmation without balances', async () => {
    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'ACCOUNT_BALANCE' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
        'at least one account balance is required',
      ),
    );
    expect(batchRecordSnapshotsUseCase.execute).not.toHaveBeenCalled();
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });

  it('batch-validates the month transactions at the validation stage', async () => {
    vi.mocked(validateMonthTransactionsUseCase.execute).mockResolvedValue({
      yearMonth: '2026-09',
      checkedCount: 3,
      issues: [],
    });

    await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'TRANSACTION_VALIDATION' });

    expect(validateMonthTransactionsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      year: 2026,
      month: 9,
      auth,
    });
    expect(saveFinancialPeriodUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        period: expect.objectContaining({
          stages: expect.objectContaining({
            TRANSACTION_VALIDATION: expect.objectContaining({ status: 'COMPLETED' }),
          }),
        }),
      }),
    );
  });

  it('creates buy and sell transactions for securities trades', async () => {
    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'SECURITIES_TRADE',
      securities: {
        buys: [{ amount: 5000, date: new Date('2026-09-02') }],
        sells: [{ amount: 2000, date: new Date('2026-09-03') }],
      },
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createTransactionUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      userEmail: 'user@test.com',
      data: expect.objectContaining({
        intent: 'SECURITY_BUY',
        intentType: 'INVESTMENT',
        amount: 5000,
        entries: [
          { ledgerCode: 'asset:investment', debit: 5000, credit: 0 },
          { ledgerCode: 'asset:cash', debit: 0, credit: 5000 },
        ],
      }),
    });
    expect(updateTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(deleteTransactionUseCase.execute).not.toHaveBeenCalled();
  });

  it('diff-merges loaded rows on re-confirm instead of duplicating', async () => {
    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'SECURITIES_TRADE',
      securities: {
        buys: [
          {
            transactionId: 'tx-1',
            amount: 6000,
            date: new Date('2026-09-02'),
            description: 'updated',
          },
          { amount: 1000, date: new Date('2026-09-05') },
        ],
        sells: [],
      },
      financing: { shareholderFinancing: [], dividendPayout: [] },
      removedTransactionIds: ['tx-9'],
    });

    expect(updateTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(updateTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'household-1',
        transactionId: 'tx-1',
        data: expect.objectContaining({ amount: 6000, intent: 'SECURITY_BUY' }),
      }),
    );
    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(deleteTransactionUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      transactionId: 'tx-9',
      auth,
    });
  });

  it('allows re-confirming the securities stage after it is completed', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'SECURITIES_TRADE'),
    );

    const period = await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'SECURITIES_TRADE',
      securities: { buys: [{ amount: 3000, date: new Date('2026-09-08') }], sells: [] },
    });

    expect(period.stages.SECURITIES_TRADE?.status).toBe('COMPLETED');
    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('rewrites the month snapshot for portfolios that already hold one', async () => {
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([
      { id: 'portfolio-1' },
      { id: 'portfolio-2' },
    ] as any);
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockImplementation(async ({ portfolioId }) =>
      portfolioId === 'portfolio-1' ? [{ id: 'snapshot-1' }] : [],
    );

    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'PORTFOLIO_CASH_FLOW',
      portfolioCashFlows: {
        'portfolio-1': { deposits: 500, withdrawals: 200 },
        'portfolio-2': { deposits: 300, withdrawals: 100 },
      },
    });

    expect(createPortfolioSnapshotUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createPortfolioSnapshotUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      portfolioId: 'portfolio-1',
      year: 2026,
      month: 9,
      cashFlow: { deposits: 500, withdrawals: 200 },
      userEmail: 'user@test.com',
      auth,
    });
  });

  it('defaults to zero cash flow for portfolios without submitted input', async () => {
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([{ id: 'portfolio-1' }] as any);
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([]);

    await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'PORTFOLIO_CASH_FLOW' });

    expect(createPortfolioSnapshotUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioId: 'portfolio-1',
        cashFlow: { deposits: 0, withdrawals: 0 },
      }),
    );
  });

  it('creates debt payments with the idempotency key and settles debt accounts', async () => {
    vi.mocked(createDebtPaymentUseCase.execute).mockResolvedValue({
      transactionId: 'tx-1',
      principal: 800,
      interest: 200,
      newBalance: 9200,
    });

    await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'DEBT_REPAYMENT',
      repayments: [
        { debtAccountId: 'debt-1', totalPayment: 1000, date: new Date('2026-09-05T10:00:00Z') },
      ],
    });

    expect(createDebtPaymentUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      userEmail: 'user@test.com',
      auth,
      debtAccountId: 'debt-1',
      idempotencyKey: 'monthly-close:2026-09:debt-1:1000:2026-09-05T10:00:00.000Z',
      totalPayment: 1000,
      date: new Date('2026-09-05T10:00:00Z'),
      description: undefined,
      projectId: undefined,
    });
    expect(settleDebtAccountsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-09',
      userEmail: 'user@test.com',
      auth,
    });
  });

  it('allows debt repayment confirmation without repayments and still settles', async () => {
    await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'DEBT_REPAYMENT' });

    expect(createDebtPaymentUseCase.execute).not.toHaveBeenCalled();
    expect(settleDebtAccountsUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('does not double-create repayment transactions when the stage is re-confirmed', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'DEBT_REPAYMENT'),
    );

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'DEBT_REPAYMENT',
        repayments: [
          { debtAccountId: 'debt-1', totalPayment: 1000, date: new Date('2026-09-05T10:00:00Z') },
        ],
      }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED,
        'stage already confirmed',
      ),
    );
    expect(createDebtPaymentUseCase.execute).not.toHaveBeenCalled();
    expect(settleDebtAccountsUseCase.execute).not.toHaveBeenCalled();
  });

  it('runs the project settlement flow', async () => {
    await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'PROJECT_SETTLEMENT' });

    expect(settleProjectsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-09',
      userEmail: 'user@test.com',
      auth,
    });
  });

  it('pauses the workflow when completeness anomalies exist', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue({
      yearMonth: '2026-09',
      activities: [],
      anomalies: [{ kind: 'ZERO_ACTIVITY_ACCOUNT', accountId: 'account-1' }],
    } as any);

    const period = await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'COMPLETENESS_CHECK' });

    expect(period.status).toBe('NEEDS_REVIEW');
    expect(period.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(saveFinancialPeriodUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        period: expect.objectContaining({
          status: 'NEEDS_REVIEW',
          reviewSourceStageId: 'COMPLETENESS_CHECK',
        }),
      }),
    );
  });

  it('completes the stage when there are no anomalies', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue({
      yearMonth: '2026-09',
      activities: [],
      anomalies: [],
    } as any);

    const period = await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'COMPLETENESS_CHECK' });

    expect(period.status).toBe('IN_PROGRESS');
    expect(period.stages.COMPLETENESS_CHECK.status).toBe('COMPLETED');
  });

  it('completes the stage when the review source stage is confirmed without re-running the check', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: 'COMPLETENESS_CHECK' }),
    );

    const period = await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'COMPLETENESS_CHECK' });

    expect(period.status).toBe('IN_PROGRESS');
    expect(period.reviewSourceStageId).toBeNull();
    expect(checkSettlementCompletenessUseCase.execute).not.toHaveBeenCalled();
  });

  it('generates reports at the reports stage', async () => {
    await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'FINANCIAL_REPORTS' });

    expect(generateFinancialReportsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 9,
    });
  });

  it('rejects the reports stage while the period needs review', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: 'COMPLETENESS_CHECK' }),
    );

    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'FINANCIAL_REPORTS' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.NEEDS_REVIEW_BLOCKED,
        'resolve the review before confirming this stage',
      ),
    );
    expect(generateFinancialReportsUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects close when reports are not persisted', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: false,
      timestamps: {},
    } as any);

    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'CLOSE_PERIOD' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.REPORTS_NOT_PERSISTED,
        'all three reports must be persisted before closing',
      ),
    );
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });

  it('closes the period when reports are persisted', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    } as any);
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'FINANCIAL_REPORTS'),
    );

    const period = await useCase.confirmStage({ ...REQUEST_BASE, stageId: 'CLOSE_PERIOD' });

    expect(period.status).toBe('CLOSED');
    expect(saveFinancialPeriodUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ period: expect.objectContaining({ status: 'CLOSED' }) }),
    );
  });

  it('rejects the close stage while the period needs review', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: 'COMPLETENESS_CHECK' }),
    );

    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'CLOSE_PERIOD' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.NEEDS_REVIEW_BLOCKED,
        'resolve the review before confirming this stage',
      ),
    );
    expect(getReportPersistenceStateUseCase.execute).not.toHaveBeenCalled();
  });

  it('re-confirms the account balance stage as an idempotent snapshot upsert', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'ACCOUNT_BALANCE'),
    );

    const period = await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'ACCOUNT_BALANCE',
      accountBalances: [{ accountId: 'account-1', amount: 1000 }],
    });

    expect(batchRecordSnapshotsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      snapshots: [
        {
          accountId: 'account-1',
          data: { accountId: 'account-1', year: 2026, month: 9, amount: 1000 },
        },
      ],
      userEmail: 'user@test.com',
      auth,
    });
    expect(period.status).toBe('IN_PROGRESS');
    expect(period.stages.ACCOUNT_BALANCE.status).toBe('COMPLETED');
    expect(period.stages.ACCOUNT_BALANCE.confirmedAt).toBeInstanceOf(Date);
  });

  it('rejects re-confirming a completed transaction stage', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'DEBT_REPAYMENT'),
    );

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'DEBT_REPAYMENT',
        repayments: [
          { debtAccountId: 'debt-1', totalPayment: 1000, date: new Date('2026-09-05T10:00:00Z') },
        ],
      }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED,
        'stage already confirmed',
      ),
    );
    expect(createDebtPaymentUseCase.execute).not.toHaveBeenCalled();
    expect(settleDebtAccountsUseCase.execute).not.toHaveBeenCalled();
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects confirmation on a closed period', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      basePeriod({ status: 'CLOSED' }),
    );

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'ACCOUNT_BALANCE',
        accountBalances: [{ accountId: 'account-1', amount: 1000 }],
      }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.PERIOD_CLOSED, 'period is closed'),
    );
    expect(batchRecordSnapshotsUseCase.execute).not.toHaveBeenCalled();
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects confirming an unknown stage', async () => {
    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'NO_SUCH_STAGE' as any }),
    ).rejects.toThrow();
  });

  it('rejects confirmation before the period is started', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(null);

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'ACCOUNT_BALANCE',
        accountBalances: [{ accountId: 'account-1', amount: 1 }],
      }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.PERIOD_NOT_STARTED,
        'start the closing workflow before confirming stages',
      ),
    );
  });

  it('rejects confirmation by a non-member', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValueOnce(
      new Error('forbidden'),
    );

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'ACCOUNT_BALANCE',
        accountBalances: [{ accountId: 'a', amount: 1 }],
      }),
    ).rejects.toThrow('forbidden');
    expect(batchRecordSnapshotsUseCase.execute).not.toHaveBeenCalled();
  });

  it('confirms the securities stage with zero rows instead of rejecting', async () => {
    const period = await useCase.confirmStage({
      ...REQUEST_BASE,
      stageId: 'SECURITIES_TRADE',
    });

    expect(period.stages.SECURITIES_TRADE?.status).toBe('COMPLETED');
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(updateTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(deleteTransactionUseCase.execute).not.toHaveBeenCalled();
  });
});
