import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { ProjectionCommandErrorCode, createProjectionUseCase } from './createProjectionUseCase';
import { getStartingNetWorthUseCase } from './getStartingNetWorthUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn() },
}));

vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn() },
}));

vi.mock('@/infra/repositories/projectionRepository', () => ({
  projectionRepository: { createProjectionAtomically: vi.fn() },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: { listByDateRange: vi.fn() },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: { getDebtAccounts: vi.fn() },
}));

vi.mock('./getStartingNetWorthUseCase', () => ({
  getStartingNetWorthUseCase: { execute: vi.fn() },
}));

vi.mock('@/firebase', () => ({ db: {} }));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const assumptions = {
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
};

const ledgerRule: ProjectionRule = {
  id: 'rule-1',
  name: 'Rent',
  ruleType: 'expense',
  enabled: true,
  source: { type: 'ledgerCode', id: 'expense:rent' },
  method: 'inflation',
  parameters: {},
  endCondition: { type: 'lifelong' },
  baselinePolicy: 'previousCompleteYear',
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    householdId: 'household-1',
    auth,
    name: 'My projection',
    startYear: 2026,
    opening: { source: 'manual' as const, amount: 100_000 },
    assumptions,
    rules: [],
    lifeEvents: [],
    ...overrides,
  };
}

describe('createProjectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });
  });

  it('calculates without writing when persist is false', async () => {
    const outcome = await createProjectionUseCase.execute(request({ persist: false }));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.id).toBeNull();
    expect(outcome.result.years).toHaveLength(2075 - 2026 + 1);
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('writes the main, config, source and results payloads in one call', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: true,
      id: 'projection-1',
    });

    const outcome = await createProjectionUseCase.execute(request());

    expect(outcome).toMatchObject({ ok: true, id: 'projection-1' });
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'household-1',
        projection: expect.objectContaining({
          name: 'My projection',
          engineVersion: 1,
          createdBy: 'user@example.com',
        }),
        config: expect.objectContaining({
          startYear: 2026,
          openingNetWorth: { amount: 100_000, source: 'manual' },
        }),
        source: { ruleSources: [] },
        results: expect.objectContaining({ years: expect.any(Array) }),
      }),
    );
  });

  it('derives the opening balance and keeps its anchor in config', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue({
      startingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: true,
      id: 'projection-2',
    });

    const outcome = await createProjectionUseCase.execute(
      request({ opening: { source: 'derived' } }),
    );

    expect(outcome.ok).toBe(true);
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          openingNetWorth: { amount: 380_000, source: 'derived', anchorYearMonth: '2026-08' },
        }),
      }),
    );
  });

  it('fails validation before resolving or writing', async () => {
    const outcome = await createProjectionUseCase.execute(
      request({ assumptions: { ...assumptions, retirementAge: 65.5 } }),
    );

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
    });
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('returns every resolver error without writing', async () => {
    const outcome = await createProjectionUseCase.execute(request({ rules: [ledgerRule] }));

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_RESOLVE_FAILED,
    });
    if (outcome.ok) return;
    expect(outcome.errors).toEqual([
      expect.objectContaining({ code: 'MISSING_LEDGER_CODE', severity: 'error' }),
    ]);
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('aggregates the ledger baseline from credit minus debit for the needed year', async () => {
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([
      { code: 'expense:rent', label: 'Rent', type: 'expense', isCustom: false, isActive: true },
    ]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      {
        entries: [
          { ledgerCode: 'expense:rent', debit: 1200, credit: 0 },
          { ledgerCode: 'expense:rent', debit: 300, credit: 100 },
          { ledgerCode: 'expense:other', debit: 999, credit: 0 },
        ],
      },
    ] as never);
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: true,
      id: 'projection-3',
    });

    await createProjectionUseCase.execute(request({ rules: [ledgerRule] }));

    expect(transactionRepository.listByDateRange).toHaveBeenCalledWith(
      'household-1',
      new Date(2025, 0, 1),
      new Date(2026, 0, 1),
    );
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          ruleSources: [
            expect.objectContaining({
              ruleId: 'rule-1',
              baselineYear: 2025,
              baselineAmount: 1400,
            }),
          ],
        }),
      }),
    );
  });

  it('maps document size failures to PROJECTION_TOO_LARGE', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: false,
      code: 'PROJECTION_TOO_LARGE',
      document: 'annual',
    });

    const outcome = await createProjectionUseCase.execute(request());

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_TOO_LARGE,
    });
  });

  it('maps a rejected batch to PROJECTION_WRITE_FAILED', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockRejectedValue(
      new Error('batch failed'),
    );

    const outcome = await createProjectionUseCase.execute(request());

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_WRITE_FAILED,
    });
  });

  it('uses a fresh repository id on every retry', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically)
      .mockResolvedValueOnce({ ok: true, id: 'projection-a' })
      .mockResolvedValueOnce({ ok: true, id: 'projection-b' });

    const first = await createProjectionUseCase.execute(request());
    const second = await createProjectionUseCase.execute(request());

    expect(first).toMatchObject({ ok: true, id: 'projection-a' });
    expect(second).toMatchObject({ ok: true, id: 'projection-b' });
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledTimes(2);
  });
});
