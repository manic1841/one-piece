import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { ProjectionCommandErrorCode } from '../errors';
import { getProjectionOpeningUseCase } from '../use_cases/getProjectionOpeningUseCase';
import { calculateProjectionWorkflow } from './calculateProjection';
import { compareRetirementAges } from './compareRetirementAges';

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

vi.mock('../use_cases/getProjectionOpeningUseCase', () => ({
  getProjectionOpeningUseCase: { execute: vi.fn() },
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

/** Serves one rent debit per requested year; unknown years stay empty. */
function mockRentDebitByYear(nets: Record<number, number>): void {
  vi.mocked(transactionRepository.listByDateRange).mockImplementation(((
    _householdId: string,
    from: Date,
  ) => {
    const debit = nets[from.getFullYear()];
    return Promise.resolve(
      debit === undefined ? [] : [{ entries: [{ ledgerCode: 'expense:rent', debit, credit: 0 }] }],
    );
  }) as never);
}

describe('calculateProjectionWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });
  });

  it('calculates without writing anything', async () => {
    const outcome = await calculateProjectionWorkflow.execute(request());

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.calculation.result.years).toHaveLength(2075 - 2026 + 1);
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('captures source facts once for every retirement-age comparison', async () => {
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([
      { code: 'expense:rent' },
    ] as never);
    mockRentDebitByYear({ 2025: 1_000 });
    const outcome = await calculateProjectionWorkflow.execute(request({ rules: [ledgerRule] }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const reads = vi.mocked(transactionRepository.listByDateRange).mock.calls.length;
    const comparisons = compareRetirementAges(outcome.comparisonInput, 2026);
    expect(comparisons).toHaveLength(85 - 36);
    expect(comparisons.every((row) => row.outcome.ok)).toBe(true);
    expect(transactionRepository.listByDateRange).toHaveBeenCalledTimes(reads);
    expect(listAllLedgerCodesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledTimes(1);
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('derives the opening balance and keeps its anchor in config', async () => {
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    const calculated = await calculateProjectionWorkflow.execute(
      request({ opening: { source: 'derived' } }),
    );

    expect(calculated.ok).toBe(true);
    if (!calculated.ok) return;
    expect(calculated.calculation.config.openingNetWorth).toEqual({
      amount: 380_000,
      source: 'derived',
      anchorYearMonth: '2026-08',
    });
  });

  it('fails validation before resolving or writing', async () => {
    const outcome = await calculateProjectionWorkflow.execute(
      request({ assumptions: { ...assumptions, retirementAge: 65.5 } }),
    );

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
    });
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('returns every resolver error without writing', async () => {
    const outcome = await calculateProjectionWorkflow.execute(request({ rules: [ledgerRule] }));

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

    const calculated = await calculateProjectionWorkflow.execute(request({ rules: [ledgerRule] }));
    expect(calculated.ok).toBe(true);
    if (!calculated.ok) return;

    expect(transactionRepository.listByDateRange).toHaveBeenCalledWith(
      'household-1',
      new Date(2025, 0, 1),
      new Date(2026, 0, 1),
    );
    expect(calculated.calculation.source.ruleSources).toEqual([
      expect.objectContaining({
        ruleId: 'rule-1',
        baselineYear: 2025,
        baselineAmount: 1400,
      }),
    ]);
  });

  it('keeps one baseline year per rule when rules share a ledger code', async () => {
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([
      { code: 'expense:rent', label: 'Rent', type: 'expense', isCustom: false, isActive: true },
    ]);
    mockRentDebitByYear({ 2024: 800, 2025: 1400 });

    const calculated = await calculateProjectionWorkflow.execute(
      request({
        rules: [
          ledgerRule,
          { ...ledgerRule, id: 'rule-2', baselinePolicy: 'specificYear', baselineYear: 2024 },
        ],
      }),
    );

    expect(calculated.ok).toBe(true);
    if (!calculated.ok) return;

    expect(calculated.calculation.source.ruleSources).toHaveLength(2);
    expect(calculated.calculation.source.ruleSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'rule-1', baselineYear: 2025, baselineAmount: 1400 }),
        expect.objectContaining({ ruleId: 'rule-2', baselineYear: 2024, baselineAmount: 800 }),
      ]),
    );
    expect(calculated.calculation.warnings).toEqual([
      expect.objectContaining({
        code: 'BASELINE_BEHIND',
        params: expect.objectContaining({ ruleId: 'rule-2' }),
      }),
    ]);
  });

  it('fetches a shared ledger code and year only once', async () => {
    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([
      { code: 'expense:rent', label: 'Rent', type: 'expense', isCustom: false, isActive: true },
    ]);
    mockRentDebitByYear({ 2025: 1400 });

    const calculated = await calculateProjectionWorkflow.execute(
      request({ rules: [ledgerRule, { ...ledgerRule, id: 'rule-2' }] }),
    );

    expect(calculated.ok).toBe(true);
    expect(transactionRepository.listByDateRange).toHaveBeenCalledTimes(1);
  });
});
