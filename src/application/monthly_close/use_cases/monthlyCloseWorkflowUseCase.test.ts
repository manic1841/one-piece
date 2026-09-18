import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/account/use_cases/batchRecordSnapshotsUseCase');
vi.mock('@/application/debt/use_cases/createDebtPaymentUseCase');
vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/application/ledger/use_cases/createTransactionUseCase');
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
  const saveFinancialPeriodUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
  return {
    GetFinancialPeriodUseCase: vi.fn().mockImplementation(function () {
      return getFinancialPeriodUseCase;
    }),
    SaveFinancialPeriodUseCase: vi.fn().mockImplementation(function () {
      return saveFinancialPeriodUseCase;
    }),
    getFinancialPeriodUseCase,
    saveFinancialPeriodUseCase,
  };
});

import { batchRecordSnapshotsUseCase } from '@/application/account/use_cases/batchRecordSnapshotsUseCase';
import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '@/application/monthly_close/errors';
import { getFinancialPeriodUseCase, saveFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { MonthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { createPortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/createPortfolioSnapshotUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';
import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';
import { type AuthContext } from '@/application/types';

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
      snapshots: [{ accountId: 'account-1', data: { accountId: 'account-1', year: 2026, month: 9, amount: 1000 } }],
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

  it('rejects account balance confirmation without balances', async () => {
    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'ACCOUNT_BALANCE' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED, 'at least one account balance is required'),
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
  });

  it('rejects securities confirmation without trades', async () => {
    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'SECURITIES_TRADE' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
        'at least one securities trade or financing entry is required',
      ),
    );
  });

  it('creates zero cash-flow snapshots only for portfolios without a month snapshot', async () => {
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
      portfolioCashFlows: { 'portfolio-2': { deposits: 300, withdrawals: 100 } },
    });

    expect(createPortfolioSnapshotUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPortfolioSnapshotUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      portfolioId: 'portfolio-2',
      year: 2026,
      month: 9,
      cashFlow: { deposits: 300, withdrawals: 100 },
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
        period: expect.objectContaining({ status: 'NEEDS_REVIEW', reviewSourceStageId: 'COMPLETENESS_CHECK' }),
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
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.NEEDS_REVIEW_BLOCKED, 'resolve the review before confirming this stage'),
    );
    expect(generateFinancialReportsUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects close when reports are not persisted', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({ isPersisted: false, timestamps: {} } as any);

    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'CLOSE_PERIOD' }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.REPORTS_NOT_PERSISTED, 'all three reports must be persisted before closing'),
    );
    expect(saveFinancialPeriodUseCase.execute).not.toHaveBeenCalled();
  });

  it('closes the period when reports are persisted', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({ isPersisted: true, timestamps: {} } as any);
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
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.NEEDS_REVIEW_BLOCKED, 'resolve the review before confirming this stage'),
    );
    expect(getReportPersistenceStateUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects confirming a stage twice', async () => {
    vi.mocked(getFinancialPeriodUseCase.execute).mockResolvedValue(
      completeStage(basePeriod(), 'ACCOUNT_BALANCE'),
    );

    await expect(
      useCase.confirmStage({
        ...REQUEST_BASE,
        stageId: 'ACCOUNT_BALANCE',
        accountBalances: [{ accountId: 'account-1', amount: 1000 }],
      }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED, 'stage already confirmed'),
    );
    expect(batchRecordSnapshotsUseCase.execute).not.toHaveBeenCalled();
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
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'ACCOUNT_BALANCE', accountBalances: [{ accountId: 'account-1', amount: 1 }] }),
    ).rejects.toEqual(
      new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.PERIOD_NOT_STARTED, 'start the closing workflow before confirming stages'),
    );
  });

  it('rejects confirmation by a non-member', async () => {
    const { householdPermissionService } = await import('@/application/household/householdPermissionService');
    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValueOnce(new Error('forbidden'));

    await expect(
      useCase.confirmStage({ ...REQUEST_BASE, stageId: 'ACCOUNT_BALANCE', accountBalances: [{ accountId: 'a', amount: 1 }] }),
    ).rejects.toThrow('forbidden');
    expect(batchRecordSnapshotsUseCase.execute).not.toHaveBeenCalled();
  });
});
