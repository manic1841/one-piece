import { describe, expect, it } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { manageRetirementEventsUseCase } from './manageRetirementEventsUseCase';

const createPlan = (): RetirementPlan => ({
  id: 'plan-1',
  householdId: 'household-1',
  name: 'Test Plan',
  isActive: true,
  autoUpdate: false,
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
      id: 'income-1',
      name: 'Salary',
      importedFrom: 'manual',
      incomeCalculationMode: 'FIXED',
      type: RetirementIncomeType.SALARY,
      startYear: 2026,
      endYear: 2060,
      baseAmount: 120000,
      growthRate: 2,
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
  events: [
    {
      id: 'event-1',
      year: 2030,
      type: 'expense',
      amount: 200000,
      name: 'Car',
    },
  ],
});

describe('manageRetirementEventsUseCase', () => {
  it('adds event with provided id', () => {
    const plan = createPlan();
    const next = manageRetirementEventsUseCase.add({
      plan,
      id: 'event-2',
      eventData: {
        year: 2035,
        type: 'income',
        amount: 150000,
        name: 'Bonus',
      },
    });

    expect(next).toHaveLength(2);
    expect(next[1].id).toBe('event-2');
  });

  it('updates event and preserves id', () => {
    const plan = createPlan();
    const next = manageRetirementEventsUseCase.update({
      plan,
      eventId: 'event-1',
      updates: {
        ...plan.events[0],
        name: 'Car Updated',
        amount: 250000,
      },
    });

    expect(next[0].id).toBe('event-1');
    expect(next[0].name).toBe('Car Updated');
    expect(next[0].amount).toBe(250000);
  });

  it('removes event by id', () => {
    const plan = createPlan();
    const next = manageRetirementEventsUseCase.remove({
      plan,
      eventId: 'event-1',
    });

    expect(next).toHaveLength(0);
  });
});
