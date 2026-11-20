import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { monthlyCloseWorkflowUseCase } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { initialStageStates } from '@/domains/financial_period/schemas';
import { formatYearMonth } from '@/ui/utils';

import { useMonthlyClosePickerPage } from './useMonthlyClosePickerPage';

vi.mock('@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase', () => ({
  monthlyCloseWorkflowUseCase: {
    start: vi.fn(),
  },
}));
const { listPeriodsExecute } = vi.hoisted(() => ({ listPeriodsExecute: vi.fn() }));
vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  ListFinancialPeriodsUseCase: class {
    execute = listPeriodsExecute;
  },
}));
// Stable hoisted identity: a fresh one per render would change the callback identity.
const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

const period = () => ({
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  reviewSourceStageId: null,
  id: '2026-09',
  createdBy: 'user@test.com',
  createdAt: new Date(),
  updatedBy: 'user@test.com',
  updatedAt: new Date(),
});

const renderPicker = () =>
  renderHook(() =>
    useMonthlyClosePickerPage({ householdId: 'household-1', userEmail: 'user@test.com' }),
  );

describe('useMonthlyClosePickerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPeriodsExecute.mockResolvedValue([]);
  });

  it('defaults the selected period to the current month', async () => {
    const { result } = renderPicker();

    const now = new Date();
    expect(result.current.selectedYearMonth).toBe(
      formatYearMonth(now.getFullYear(), now.getMonth() + 1),
    );
    expect(result.current.error).toBeNull();
  });

  it('moves the default to the newest period that already has a record', async () => {
    listPeriodsExecute.mockResolvedValue([
      period(),
      { ...period(), yearMonth: '2026-11', id: '2026-11' },
      { ...period(), yearMonth: '2026-08', id: '2026-08' },
    ]);

    const { result } = renderPicker();

    await act(async () => {});

    expect(result.current.selectedYearMonth).toBe('2026-11');
  });

  it('keeps the current month when no period has a record', async () => {
    const { result } = renderPicker();

    await act(async () => {});

    const now = new Date();
    expect(result.current.selectedYearMonth).toBe(
      formatYearMonth(now.getFullYear(), now.getMonth() + 1),
    );
  });

  it('does not steal a month the user picked after the read settled', async () => {
    const { result } = renderPicker();
    await act(async () => {});

    await act(async () => {
      result.current.setYear('2025');
      result.current.setMonth('02');
    });

    expect(result.current.selectedYearMonth).toBe('2025-02');
  });

  it('starts the picked month and reports success', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(period());

    const { result } = renderPicker();

    let started = false;
    await act(async () => {
      started = await result.current.start('2026-09');
    });

    expect(started).toBe(true);
    expect(monthlyCloseWorkflowUseCase.start).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-09',
      userEmail: 'user@test.com',
      auth: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces a start failure as error text and reports failure', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockRejectedValue(new Error('boom'));

    const { result } = renderPicker();

    let started = true;
    await act(async () => {
      started = await result.current.start('2026-09');
    });

    expect(started).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('starts the argument month rather than the selected one', async () => {
    vi.mocked(monthlyCloseWorkflowUseCase.start).mockResolvedValue(period());

    const { result } = renderPicker();

    await act(async () => {
      result.current.setYear('2026');
      result.current.setMonth('01');
    });
    await act(async () => {
      await result.current.start(result.current.selectedYearMonth);
    });

    expect(monthlyCloseWorkflowUseCase.start).toHaveBeenCalledWith(
      expect.objectContaining({ yearMonth: '2026-01' }),
    );
  });
});
