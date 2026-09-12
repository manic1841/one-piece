import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { syncImportedIncomeSourcesUseCase } from './syncImportedIncomeSourcesUseCase';

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listByDateRange: vi.fn(),
  },
}));

const createPlan = (): RetirementPlan => ({
  id: 'plan-1',
  householdId: 'household-1',
  name: 'Test Plan',
  isActive: true,
  autoUpdate: true,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  currentYear: 2026,
  birthYear: 1985,
  retirementAge: 60,
  lifeExpectancy: 85,
  currentSavings: 0,
  salaryGrowthRate: 3,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [
    {
      id: 'income-imported',
      name: 'Salary',
      importedFrom: 'transactionEntries',
      incomeCalculationMode: 'IMPORTED',
      autoUpdate: true,
      calculatedFrom: {
        ledgerCode: 'income:salary:charles',
        sampleYear: 2024,
        totalAmount: 120000,
        monthlyAverage: 10000,
        sampleCount: 12,
        importedAt: '2025-01-01T00:00:00.000Z',
      },
      incomeCategory: 'salary:charles',
      derivedFrom: undefined,
      type: RetirementIncomeType.SALARY,
      startYear: 2026,
      endYear: 2060,
      baseAmount: 120000,
      growthRate: 2,
      note: undefined,
    },
    {
      id: 'income-manual',
      name: 'Pension',
      importedFrom: 'manual',
      incomeCalculationMode: 'FIXED',
      autoUpdate: false,
      type: RetirementIncomeType.PENSION,
      startYear: 2030,
      endYear: 2080,
      baseAmount: 30000,
      growthRate: 1,
    },
  ],
  expenses: [
    {
      id: 'expense-1',
      name: 'Living',
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
      calculationMode: 'FIXED',
      baseAmount: 50000,
      growthRate: 2,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: null,
      salaryPercentageRetirementMode: 'INFLATION_BASED',
    },
  ],
  events: [],
});

describe('syncImportedIncomeSourcesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unchanged incomes when autoUpdate is disabled', async () => {
    const plan = { ...createPlan(), autoUpdate: false };

    const result = await syncImportedIncomeSourcesUseCase.execute({
      householdId: 'household-1',
      plan,
      today: new Date('2026-04-06T00:00:00.000Z'),
    });

    expect(result.hasChanges).toBe(false);
    expect(result.incomes).toBe(plan.incomes);
    expect(transactionRepository.listByDateRange).not.toHaveBeenCalled();
  });

  it('shifts imported window and recalculates annual base amount', async () => {
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      {
        id: 'tx-1',
        entries: [
          { ledgerCode: 'income:salary:charles', credit: 12000, debit: 0 },
          { ledgerCode: 'asset:cash', credit: 0, debit: 12000 },
        ],
      },
      {
        id: 'tx-2',
        entries: [{ ledgerCode: 'income:salary:charles', credit: 24000, debit: 0 }],
      },
    ] as never);

    const plan = createPlan();

    const result = await syncImportedIncomeSourcesUseCase.execute({
      householdId: 'household-1',
      plan,
      today: new Date('2026-04-06T00:00:00.000Z'),
    });

    expect(result.hasChanges).toBe(true);
    expect(result.staleCount).toBe(1);
    expect(result.targetSampleYear).toBe(2025);
    expect(transactionRepository.listByDateRange).toHaveBeenCalledTimes(1);

    const imported = result.incomes.find((income) => income.id === 'income-imported');
    expect(imported).toBeTruthy();
    expect(imported?.calculatedFrom?.sampleYear).toBe(2025);
    expect(imported?.calculatedFrom?.sampleCount).toBe(2);
    expect(imported?.calculatedFrom?.totalAmount).toBe(36000);
    expect(imported?.calculatedFrom?.monthlyAverage).toBe(3000);
    expect(imported?.baseAmount).toBe(36000);
    expect(imported?.note).toContain('Auto-updated using 2025 full-year transactions');

    const manual = result.incomes.find((income) => income.id === 'income-manual');
    expect(manual).toEqual(plan.incomes[1]);
  });

  it('does not update when sample year already matches last full year', async () => {
    const plan = createPlan();
    plan.incomes[0].calculatedFrom = {
      ...plan.incomes[0].calculatedFrom!,
      sampleYear: 2024,
    };

    const result = await syncImportedIncomeSourcesUseCase.execute({
      householdId: 'household-1',
      plan,
      today: new Date('2025-10-01T00:00:00.000Z'),
    });

    expect(result.hasChanges).toBe(false);
    expect(result.staleCount).toBe(0);
    expect(result.incomes[0]).toEqual(plan.incomes[0]);
    expect(transactionRepository.listByDateRange).not.toHaveBeenCalled();
  });
});
