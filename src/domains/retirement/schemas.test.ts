import { describe, expect, it } from 'vitest';

import {
  RetirementIncomeSourceSchema,
  RetirementPlanSchema,
} from './schemas';

const importedStreamFixture = {
  id: 'inc-1',
  name: 'Salary',
  type: 'salary',
  startYear: 2026,
  endYear: 2046,
  currentAnnual: 120000,
  calculatedFrom: {
    ledgerCode: 'income:salary:charles',
    sampleYear: 2025,
    totalAmount: 120000,
    monthlyAverage: 10000,
    sampleCount: 12,
    importedAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('RetirementIncomeSourceSchema v2 convergence (issue #133)', () => {
  it('parses a stale stream carrying removed flags and drops them', () => {
    const income = RetirementIncomeSourceSchema.parse({
      ...importedStreamFixture,
      importedFrom: 'transactionEntries',
      autoUpdate: true,
      startYearMode: 'MANUAL',
      endYearMode: 'MANUAL',
    });

    expect(income).not.toHaveProperty('importedFrom');
    expect(income).not.toHaveProperty('autoUpdate');
    expect(income).not.toHaveProperty('startYearMode');
    expect(income).not.toHaveProperty('endYearMode');
    expect(income.currentAnnual).toBe(120000);
  });

  it('parses a scenario-only stream with null currentAnnual', () => {
    const income = RetirementIncomeSourceSchema.parse({
      ...importedStreamFixture,
      currentAnnual: null,
    });

    expect(income.currentAnnual).toBeNull();
  });

  it('parses a stream without removed flags at all', () => {
    const income = RetirementIncomeSourceSchema.parse(importedStreamFixture);

    expect(income.currentAnnual).toBe(120000);
    expect(income.calculatedFrom?.sampleYear).toBe(2025);
  });
});

const basePlan = {
  id: 'p1',
  createdBy: 'u1',
  updatedBy: 'u1',
  name: 'Plan A',
  isActive: true,
  autoUpdate: false,
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [],
  expenses: [],
  events: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('RetirementPlanSchema summary', () => {
  it('parses a stale summary cached before the rename (issue #130)', () => {
    const plan = RetirementPlanSchema.parse({
      ...basePlan,
      summary: {
        retirementYear: 2050,
        startingNetWorth: 100000,
        anchorYearMonth: '2025-12',
        savingsAtRetirement: 500000,
        minSavings: 100000,
        minSavingsYear: 2050,
        isBankrupt: false,
        lastCalculatedAt: new Date('2026-01-02'),
      },
    });

    expect(plan.summary?.netWorthAtRetirement).toBeUndefined();
    expect(plan.summary?.finalNetWorth).toBeUndefined();
  });

  it('parses a recalculated summary carrying both net-worth fields', () => {
    const plan = RetirementPlanSchema.parse({
      ...basePlan,
      summary: {
        retirementYear: 2050,
        startingNetWorth: 100000,
        anchorYearMonth: '2025-12',
        netWorthAtRetirement: 500000,
        finalNetWorth: 300000,
        minSavings: 100000,
        minSavingsYear: 2050,
        isBankrupt: false,
        lastCalculatedAt: new Date('2026-01-02'),
      },
    });

    expect(plan.summary?.netWorthAtRetirement).toBe(500000);
    expect(plan.summary?.finalNetWorth).toBe(300000);
  });
});
