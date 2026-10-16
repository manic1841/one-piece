import { act, renderHook } from '@testing-library/react';
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

const { showToastMock, confirmMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('@/ui/components/Toast', () => ({ showToast: showToastMock }));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

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

const SAMPLE_YEAR = 2023;

const createPlan = (): RetirementPlan =>
  ({
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
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [
      {
        id: 'income-1',
        name: 'Salary',
        type: RetirementIncomeType.SALARY,
        startYear: 2026,
        endYear: 2060,
        currentAnnual: 120000,
        growthRate: 2,
        calculatedFrom: {
          ledgerCode: 'income:salary',
          sampleYear: SAMPLE_YEAR,
          totalAmount: 120000,
          monthlyAverage: 10000,
          sampleCount: 12,
          importedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        name: 'Living',
        type: RetirementExpenseType.GENERAL,
        includesPrincipal: false,
        interestOnly: false,
        currentAnnual: 50000,
        growthRate: 2,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: null,
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
  }) as RetirementPlan;

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

  const handleUpdateExpense = vi.fn();
  const handleDeleteExpense = vi.fn();
  const handleImportDebtRepayments = vi.fn();

  const handleUpdateIncome = vi.fn();
  const handleDeleteIncome = vi.fn();
  const handleImportIncomeFromTransactions = vi.fn();

  const handleAddEvent = vi.fn();
  const handleUpdateEvent = vi.fn();
  const handleDeleteEvent = vi.fn();

  const coreReturnValue = (plan: RetirementPlan | null) => ({
    plan,
    loading: false,
    error: null,
    reload: vi.fn().mockResolvedValue(undefined),
    netWorthSource: {
      startingNetWorth: 100000,
      anchorYearMonth: '2025-12',
      assets: 200000,
      liabilities: 100000,
    },
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    importIncomeData: vi.fn().mockResolvedValue([]),
    importDebtData: vi.fn().mockResolvedValue([]),
    importExpenseDataFromLedger: vi.fn().mockResolvedValue([]),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockedCore.mockReturnValue(coreReturnValue(null));

    mockedExpenseActions.mockReturnValue({
      handleUpdateExpense,
      handleDeleteExpense,
      handleImportDebtRepayments,
    });

    mockedIncomeActions.mockReturnValue({
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
    expect(result.current.netWorthSource).toBeTruthy();
    expect(result.current.baselineItems).toEqual([]);
    expect(result.current.eventItems).toEqual([]);
    expect(result.current.projectionVM).toBeNull();

    expect(result.current.handleUpdatePlan).toBe(handleUpdatePlan);
    expect(result.current.handleToggleAutoUpdate).toBe(handleToggleAutoUpdate);
    expect(result.current.handleRecalculate).toBe(handleRecalculate);
    expect(result.current.handleDelete).toBe(handleDelete);
    expect(result.current.handleSaveName).toBe(handleSaveName);

    expect(result.current.handleUpdateExpense).toBe(handleUpdateExpense);
    expect(result.current.handleDeleteExpense).toBe(handleDeleteExpense);
    expect(typeof result.current.handleImportDebtRepayments).toBe('function');

    expect(result.current.handleUpdateIncome).toBe(handleUpdateIncome);
    expect(result.current.handleDeleteIncome).toBe(handleDeleteIncome);
    expect(typeof result.current.handleImportFromLedger).toBe('function');

    expect(result.current.handleAddEvent).toBe(handleAddEvent);
    expect(result.current.handleUpdateEvent).toBe(handleUpdateEvent);
    expect(result.current.handleDeleteEvent).toBe(handleDeleteEvent);
  });

  it('maps display data when plan exists', () => {
    mockedCore.mockReturnValueOnce(coreReturnValue(createPlan()));

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    expect(result.current.plan?.id).toBe('plan-1');
    expect(result.current.headerVM).toBeTruthy();
    expect(result.current.assumptionsVM).toBeTruthy();
    expect(result.current.netWorthSource).toBeTruthy();
    expect(result.current.baselineItems).toHaveLength(2);
    expect(result.current.eventItems).toHaveLength(1);
    expect(result.current.projectionVM).toBeTruthy();
  });

  it('toasts on import and surfaces the unmatched notice, which can be dismissed', async () => {
    mockedCore.mockReturnValueOnce(coreReturnValue(createPlan()));
    mockedIncomeActions.mockReturnValueOnce({
      handleUpdateIncome,
      handleDeleteIncome,
      handleImportIncomeFromTransactions: vi.fn().mockResolvedValue(2),
    });

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    await act(async () => {
      await result.current.handleImportFromLedger();
    });

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(result.current.importNotice).toEqual({ unmatchedCount: 2 });

    act(() => result.current.handleDismissImportNotice());

    expect(result.current.importNotice).toBeNull();
  });

  const planWithRetirementEndingIncome = (): RetirementPlan => {
    const base = createPlan();
    // endYear === birthYear 1985 + retirementAge 60 = 2045 → 「退休時結束」.
    return { ...base, incomes: [{ ...base.incomes[0], endYear: 2045 }] };
  };

  it('prompts before moving 退休時結束 rows, then writes the shifted rows on confirm', async () => {
    mockedCore.mockReturnValueOnce(coreReturnValue(planWithRetirementEndingIncome()));
    confirmMock.mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    await act(async () => {
      await result.current.handleSaveAssumptions({ birthYear: 1985, retirementAge: 65 });
    });

    expect(confirmMock).toHaveBeenCalledTimes(1);
    const updates = handleUpdatePlan.mock.calls[0][0];
    expect(updates.retirementAge).toBe(65);
    expect(updates.incomes[0].endYear).toBe(2050);
  });

  it('saves the assumptions without moving rows when the confirmation is declined', async () => {
    mockedCore.mockReturnValueOnce(coreReturnValue(planWithRetirementEndingIncome()));
    confirmMock.mockResolvedValueOnce(false);

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    await act(async () => {
      await result.current.handleSaveAssumptions({ birthYear: 1985, retirementAge: 65 });
    });

    expect(handleUpdatePlan).toHaveBeenCalledWith({ birthYear: 1985, retirementAge: 65 });
  });

  it('does not prompt when no stored row would move', async () => {
    mockedCore.mockReturnValueOnce(coreReturnValue(createPlan()));

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    await act(async () => {
      await result.current.handleSaveAssumptions({ birthYear: 1985, retirementAge: 65 });
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(handleUpdatePlan).toHaveBeenCalledWith({ birthYear: 1985, retirementAge: 65 });
  });

  it('exposes summary staleness derived from the persisted plan', () => {
    mockedCore.mockReturnValueOnce(
      coreReturnValue({
        ...createPlan(),
        // birthYear 1985 + retirementAge 60 = 2045; the cached year disagrees.
        summary: { retirementYear: 2046 } as RetirementPlan['summary'],
      }),
    );

    const { result } = renderHook(() =>
      useRetirementPlanDetailPage('plan-1', 'household-1', 'user@example.com'),
    );

    expect(result.current.isSummaryStale).toBe(true);
  });
});
