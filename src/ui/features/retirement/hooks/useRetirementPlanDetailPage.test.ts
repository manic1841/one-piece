import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { useRetirementEventActions } from './useRetirementEventActions';
import { useRetirementExpenseActions } from './useRetirementExpenseActions';
import { useRetirementIncomeActions } from './useRetirementIncomeActions';
import { useRetirementPlanCore } from './useRetirementPlanCore';
import { useRetirementPlanDetailPage } from './useRetirementPlanDetailPage';

vi.mock('./useRetirementPlanCore', () => ({
  useRetirementPlanCore: vi.fn(),
}));

vi.mock('./useRetirementExpenseActions', () => ({
  useRetirementExpenseActions: vi.fn(),
}));

vi.mock('./useRetirementIncomeActions', () => ({
  useRetirementIncomeActions: vi.fn(),
}));

vi.mock('./useRetirementEventActions', () => ({
  useRetirementEventActions: vi.fn(),
}));

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
  currentSavings: 100000,
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
      year: 2035,
      type: 'expense',
      amount: 150000,
      name: 'Car',
    },
  ],
});

describe('useRetirementPlanDetailPage', () => {
  const mockedCore = vi.mocked(useRetirementPlanCore);
  const mockedExpenseActions = vi.mocked(useRetirementExpenseActions);
  const mockedIncomeActions = vi.mocked(useRetirementIncomeActions);
  const mockedEventActions = vi.mocked(useRetirementEventActions);

  const handleUpdatePlan = vi.fn();
  const handleToggleAutoUpdate = vi.fn();
  const handleRecalculate = vi.fn();
  const handleDelete = vi.fn();
  const handleSaveName = vi.fn();
  const handleCancelEditName = vi.fn();
  const setEditedName = vi.fn();
  const setIsEditingName = vi.fn();

  const handleAddExpense = vi.fn();
  const handleUpdateExpense = vi.fn();
  const handleDeleteExpense = vi.fn();
  const handleImportDebtRepayments = vi.fn();

  const handleAddIncome = vi.fn();
  const handleUpdateIncome = vi.fn();
  const handleDeleteIncome = vi.fn();
  const handleImportIncomeFromTransactions = vi.fn();

  const handleAddEvent = vi.fn();
  const handleUpdateEvent = vi.fn();
  const handleDeleteEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedCore.mockReturnValue({
      plan: null,
      loading: false,
      error: null,
      isEditingName: false,
      editedName: '',
      setEditedName,
      setIsEditingName,
      handleUpdatePlan,
      handleToggleAutoUpdate,
      handleRecalculate,
      handleDelete,
      handleSaveName,
      handleCancelEditName,
      importData: vi.fn().mockResolvedValue([]),
    });

    mockedExpenseActions.mockReturnValue({
      handleAddExpense,
      handleUpdateExpense,
      handleDeleteExpense,
      handleImportDebtRepayments,
    });

    mockedIncomeActions.mockReturnValue({
      handleAddIncome,
      handleUpdateIncome,
      handleDeleteIncome,
      handleImportIncomeFromTransactions,
    });

    mockedEventActions.mockReturnValue({
      handleAddEvent,
      handleUpdateEvent,
      handleDeleteEvent,
    });
  });

  it('composes core and action hooks while keeping public handlers stable', () => {
    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    expect(mockedCore).toHaveBeenCalledWith({
      id: 'plan-1',
      householdId: 'household-1',
      userEmail: 'user@example.com',
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.headerVM).toBeNull();
    expect(result.current.assumptionsVM).toBeNull();
    expect(result.current.incomeItems).toEqual([]);
    expect(result.current.expenseItems).toEqual([]);
    expect(result.current.eventItems).toEqual([]);
    expect(result.current.projectionVM).toBeNull();

    expect(result.current.handleUpdatePlan).toBe(handleUpdatePlan);
    expect(result.current.handleToggleAutoUpdate).toBe(handleToggleAutoUpdate);
    expect(result.current.handleRecalculate).toBe(handleRecalculate);
    expect(result.current.handleDelete).toBe(handleDelete);
    expect(result.current.handleSaveName).toBe(handleSaveName);
    expect(result.current.handleCancelEditName).toBe(handleCancelEditName);

    expect(result.current.handleAddExpense).toBe(handleAddExpense);
    expect(result.current.handleUpdateExpense).toBe(handleUpdateExpense);
    expect(result.current.handleDeleteExpense).toBe(handleDeleteExpense);
    expect(result.current.handleImportDebtRepayments).toBe(handleImportDebtRepayments);

    expect(result.current.handleAddIncome).toBe(handleAddIncome);
    expect(result.current.handleUpdateIncome).toBe(handleUpdateIncome);
    expect(result.current.handleDeleteIncome).toBe(handleDeleteIncome);
    expect(result.current.handleImportIncomeFromTransactions).toBe(
      handleImportIncomeFromTransactions,
    );

    expect(result.current.handleAddEvent).toBe(handleAddEvent);
    expect(result.current.handleUpdateEvent).toBe(handleUpdateEvent);
    expect(result.current.handleDeleteEvent).toBe(handleDeleteEvent);
  });

  it('maps display data when plan exists', () => {
    mockedCore.mockReturnValueOnce({
      plan: createPlan(),
      loading: false,
      error: null,
      isEditingName: true,
      editedName: 'Edited Plan',
      setEditedName,
      setIsEditingName,
      handleUpdatePlan,
      handleToggleAutoUpdate,
      handleRecalculate,
      handleDelete,
      handleSaveName,
      handleCancelEditName,
      importData: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    expect(result.current.plan?.id).toBe('plan-1');
    expect(result.current.headerVM).toBeTruthy();
    expect(result.current.assumptionsVM).toBeTruthy();
    expect(result.current.incomeItems).toHaveLength(1);
    expect(result.current.expenseItems).toHaveLength(1);
    expect(result.current.eventItems).toHaveLength(1);
    expect(result.current.projectionVM).toBeTruthy();
    expect(result.current.isEditingName).toBe(true);
    expect(result.current.editedName).toBe('Edited Plan');
  });
});
