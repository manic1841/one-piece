import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { useRetirementPlanCore } from './useRetirementPlanCore';

const { navigateMock, confirmMock, getPlanMock, updatePlanMock, deletePlanMock, authIdentity } =
  vi.hoisted(() => ({
    navigateMock: vi.fn(),
    confirmMock: vi.fn(),
    getPlanMock: vi.fn(),
    updatePlanMock: vi.fn(),
    deletePlanMock: vi.fn(),
    // Stable identity: a fresh object per render would re-run the load effect.
    authIdentity: { uid: 'u1', email: 'u1@example.com', isGlobalAdmin: false },
  }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('./useRetirementPlans', () => ({
  useRetirementPlans: () => ({ getPlan: getPlanMock, loading: false, error: null }),
}));

vi.mock('./useRetirementPlanCmds', () => ({
  useRetirementPlanCmds: () => ({
    updatePlan: updatePlanMock,
    deletePlan: deletePlanMock,
  }),
}));

vi.mock('@/application/retirement/use_cases/getStartingNetWorthUseCase', () => ({
  getStartingNetWorthUseCase: {
    execute: vi.fn().mockResolvedValue({ reason: 'no-closed-period' }),
  },
}));

vi.mock('@/application/retirement/use_cases/importRetirementDebtUseCase', () => ({
  importRetirementDebtUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/application/retirement/use_cases/importRetirementExpensesUseCase', () => ({
  importRetirementExpensesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/application/retirement/use_cases/importRetirementIncomeUseCase', () => ({
  importRetirementIncomeUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/application/retirement/use_cases/syncImportedIncomeSourcesUseCase', () => ({
  syncImportedIncomeSourcesUseCase: { execute: vi.fn().mockResolvedValue({ staleCount: 0 }) },
}));

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
    events: [],
  }) as RetirementPlan;

const setup = () =>
  renderHook(() =>
    useRetirementPlanCore({
      id: 'plan-1',
      householdId: 'household-1',
      userEmail: 'u1@example.com',
    }),
  );

describe('useRetirementPlanCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlanMock.mockResolvedValue({ ok: true, value: createPlan() });
    updatePlanMock.mockResolvedValue(undefined);
  });

  it('reconciles the plan from the write payload instead of re-reading it', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    getPlanMock.mockClear();

    await act(async () => {
      await result.current.handleUpdatePlan({ expenses: [] });
    });

    expect(updatePlanMock).toHaveBeenCalledWith('plan-1', { expenses: [] });
    expect(result.current.plan?.expenses).toEqual([]);
    // The re-read would be served by the long-lived Firestore instance, whose
    // child-collection snapshot is stale after a transaction delete: it would
    // resurrect the deleted rows and blank the page behind a skeleton.
    expect(getPlanMock).not.toHaveBeenCalled();
  });

  it('merges partial scalar updates into the loaded plan', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    getPlanMock.mockClear();

    await act(async () => {
      await result.current.handleUpdatePlan({ autoUpdate: true });
    });

    expect(result.current.plan?.autoUpdate).toBe(true);
    // Untouched fields keep their loaded values.
    expect(result.current.plan?.name).toBe('Test Plan');
    expect(result.current.plan?.expenses).toHaveLength(1);
    expect(getPlanMock).not.toHaveBeenCalled();
  });
});
