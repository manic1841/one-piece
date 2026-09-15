import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkSettlementCompletenessUseCase } from './checkSettlementCompletenessUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/watchListRepository', () => ({
  watchListRepository: {
    listTargets: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: {
    getProjects: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: {
    getAllocationsByMonth: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listByDateRange: vi.fn(),
    listDebtPaymentsByDateRange: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    getDebtAccounts: vi.fn(),
  },
}));

const watchTarget = (targetType: 'PROJECT' | 'LEDGER_CODE' | 'DEBT_ACCOUNT', targetId: string) => ({
  id: `${targetType}:${targetId}`,
  targetType,
  targetId,
  name: `${targetId}-name`,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
});

const debtAccount = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: id === 'd1' ? '房貸 A' : `${id}-name`,
  isActive: true,
  startDate: new Date('2026-01-15'),
  endDate: new Date('2029-01-15'),
  graceEndDate: null,
  linkedLedgerCode: 'liability:mortgage',
  ...overrides,
});

describe('checkSettlementCompletenessUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const request = {
    householdId: 'household-1',
    year: 2026,
    month: 9,
    auth: { uid: 'user-1', isGlobalAdmin: false },
  };

  it('passes with an empty watch list without loading settlement data', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([]);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(allocationRepository.getAllocationsByMonth).not.toHaveBeenCalled();
    expect(transactionRepository.listByDateRange).not.toHaveBeenCalled();
  });

  it('flags a watched project with zero allocations in the target month', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { projectRepository } = await import('@/infra/repositories/projectRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([watchTarget('PROJECT', 'p1')]);
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'p1-name', isActive: true },
    ] as never);
    vi.mocked(allocationRepository.getAllocationsByMonth).mockResolvedValue([
      { id: 'a2', projectIds: ['other'], items: [{ projectId: 'other', amount: 10 }] },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(allocationRepository.getAllocationsByMonth).toHaveBeenCalledWith(
      'household-1',
      '2026-09',
    );
    expect(result.anomalies).toEqual([
      {
        targetType: 'PROJECT',
        targetId: 'p1',
        name: 'p1-name',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
  });

  it('summarizes count and amount for a project with activity', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { projectRepository } = await import('@/infra/repositories/projectRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([watchTarget('PROJECT', 'p1')]);
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'p1-name', isActive: true },
    ] as never);
    vi.mocked(allocationRepository.getAllocationsByMonth).mockResolvedValue([
      { id: 'a1', projectIds: [], items: [{ projectId: 'p1', amount: 300 }] },
      {
        id: 'a2',
        projectIds: ['p1'],
        items: [
          { projectId: 'p1', amount: 200 },
          { projectId: 'other', amount: 50 },
        ],
      },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies).toEqual([]);
    expect(result.activities).toEqual([
      {
        targetType: 'PROJECT',
        targetId: 'p1',
        name: 'p1-name',
        status: 'HAS_ACTIVITY',
        activityCount: 2,
        activityAmount: 500,
      },
    ]);
  });

  it('skips watched projects that are inactive or deleted', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { projectRepository } = await import('@/infra/repositories/projectRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([watchTarget('PROJECT', 'gone')]);
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'gone', name: 'gone-name', isActive: false },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(allocationRepository.getAllocationsByMonth).not.toHaveBeenCalled();
  });

  it('loads projects only once for multiple watched projects', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { projectRepository } = await import('@/infra/repositories/projectRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('PROJECT', 'p1'),
      watchTarget('PROJECT', 'p2'),
    ]);
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'p1-name', isActive: true },
      { id: 'p2', name: 'p2-name', isActive: true },
    ] as never);
    vi.mocked(allocationRepository.getAllocationsByMonth).mockResolvedValue([
      { id: 'a1', projectIds: ['p1'], items: [{ projectId: 'p1', amount: 100 }] },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(projectRepository.getProjects).toHaveBeenCalledTimes(1);
    expect(result.anomalies.map((a) => a.targetId)).toEqual(['p2']);
  });

  it('counts watched ledger code activity from denormalized entry codes', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('LEDGER_CODE', 'expense:food'),
    ]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      { amount: 100, ledgerCodes: ['expense:food', 'asset:cash'] },
      { amount: 50, ledgerCodes: ['expense:food'] },
      { amount: 70, ledgerCodes: ['expense:tax'] },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(transactionRepository.listByDateRange).toHaveBeenCalledWith(
      'household-1',
      new Date(2026, 8, 1),
      new Date(2026, 9, 1),
    );
    expect(result.anomalies).toEqual([]);
    expect(result.activities).toEqual([
      {
        targetType: 'LEDGER_CODE',
        targetId: 'expense:food',
        name: 'expense:food-name',
        status: 'HAS_ACTIVITY',
        activityCount: 2,
        activityAmount: 150,
      },
    ]);
  });

  it('flags a watched ledger code with zero transactions', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('LEDGER_CODE', 'expense:food'),
      watchTarget('LEDGER_CODE', 'expense:tax'),
    ]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      { amount: 100, ledgerCodes: ['expense:food'] },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies).toEqual([
      {
        targetType: 'LEDGER_CODE',
        targetId: 'expense:tax',
        name: 'expense:tax-name',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
  });

  it('counts ledger activity from entries when the denormalized index is absent', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('LEDGER_CODE', 'expense:food'),
    ]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      { amount: 80, entries: [{ ledgerCode: 'expense:food' }, { ledgerCode: 'asset:cash' }] },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies).toEqual([]);
    expect(result.activities[0]).toEqual(
      expect.objectContaining({ activityCount: 1, activityAmount: 80 }),
    );
  });

  it('attributes per-entry amounts when one transaction covers two watched codes', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('LEDGER_CODE', 'expense:food'),
      watchTarget('LEDGER_CODE', 'expense:transportation'),
    ]);
    // One transaction, one journal line per code: each code gets its own line
    // amount, not the whole transaction total (no double attribution).
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      {
        amount: 300,
        ledgerCodes: ['expense:food', 'expense:transportation'],
        entries: [
          { ledgerCode: 'expense:food', debit: 200, credit: 0 },
          { ledgerCode: 'expense:transportation', debit: 100, credit: 0 },
        ],
      },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: 'expense:food',
          activityCount: 1,
          activityAmount: 200,
        }),
        expect.objectContaining({
          targetId: 'expense:transportation',
          activityCount: 1,
          activityAmount: 100,
        }),
      ]),
    );
  });

  it('flags a watched debt account with no repayment in the target month', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1', {
        startDate: new Date('2026-01-15'),
        endDate: new Date('2029-01-15'),
      }),
    ] as never);
    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([]);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    // Repayment comes from DEBT_PAYMENT queries, not ledger-code activity: a
    // new loan in the same month would hide a missed repayment (ADR-0048).
    expect(transactionRepository.listDebtPaymentsByDateRange).toHaveBeenCalledWith(
      'household-1',
      new Date(2026, 8, 1),
      new Date(2026, 9, 1),
    );
    expect(transactionRepository.listByDateRange).not.toHaveBeenCalled();
    expect(result.anomalies).toEqual([
      {
        targetType: 'DEBT_ACCOUNT',
        targetId: 'd1',
        name: '房貸 A',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
  });

  it('summarizes repayment count and amount for a watched debt account', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1'),
    ] as never);
    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'd1', amount: 1200 },
      { debtAccountId: 'd1', amount: 300 },
      // Another account's payment must not count toward this one.
      { debtAccountId: 'd2', amount: 900 },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies).toEqual([]);
    expect(result.activities).toEqual([
      {
        targetType: 'DEBT_ACCOUNT',
        targetId: 'd1',
        name: '房貸 A',
        status: 'HAS_ACTIVITY',
        activityCount: 2,
        activityAmount: 1500,
      },
    ]);
  });

  it('skips watched debt accounts that are inactive', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1', { isActive: false }),
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(transactionRepository.listDebtPaymentsByDateRange).not.toHaveBeenCalled();
  });

  it('skips watched debt accounts whose loan period has not started or already ended', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'future'),
      watchTarget('DEBT_ACCOUNT', 'finished'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('future', { startDate: new Date('2026-10-01'), endDate: new Date('2029-01-15') }),
      debtAccount('finished', {
        startDate: new Date('2024-01-15'),
        endDate: new Date('2026-08-31'),
      }),
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(transactionRepository.listDebtPaymentsByDateRange).not.toHaveBeenCalled();
  });

  it('still warns during a grace period, whose payments are recorded as DEBT_PAYMENT', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1', {
        startDate: new Date('2026-08-01'),
        endDate: new Date('2029-01-15'),
        graceEndDate: new Date('2026-12-01'),
      }),
    ] as never);
    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([]);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies.map((a) => a.targetId)).toEqual(['d1']);
  });

  it('clears the warning for an interest-only repayment made during the grace period', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1', {
        startDate: new Date('2026-08-01'),
        endDate: new Date('2029-01-15'),
        graceEndDate: new Date('2026-12-01'),
      }),
    ] as never);
    // Interest-only, principal 0: exactly the DEBT_PAYMENT a grace-period
    // payment produces (ADR-0017), so the month counts as repaid.
    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'd1', amount: 2083 },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.anomalies).toEqual([]);
    expect(result.activities).toEqual([
      expect.objectContaining({ targetId: 'd1', status: 'HAS_ACTIVITY', activityCount: 1 }),
    ]);
  });

  it('skips a watched debt account whose document was deleted', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'gone'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(transactionRepository.listDebtPaymentsByDateRange).not.toHaveBeenCalled();
  });

  it('loads debt accounts once and reads repayments once for several accounts', async () => {
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(watchListRepository.listTargets).mockResolvedValue([
      watchTarget('DEBT_ACCOUNT', 'd1'),
      watchTarget('DEBT_ACCOUNT', 'd2'),
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      debtAccount('d1'),
      debtAccount('d2', { name: '信貸 B' }),
    ] as never);
    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'd1', amount: 1200 },
    ] as never);

    const result = await checkSettlementCompletenessUseCase.execute(request);

    expect(debtAccountRepository.getDebtAccounts).toHaveBeenCalledTimes(1);
    expect(transactionRepository.listDebtPaymentsByDateRange).toHaveBeenCalledTimes(1);
    expect(result.anomalies.map((a) => a.name)).toEqual(['信貸 B']);
  });

  it('propagates permission errors instead of failing silently', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValue(
      new Error('Permission denied'),
    );

    await expect(checkSettlementCompletenessUseCase.execute(request)).rejects.toThrow(
      'Permission denied',
    );
  });
});
