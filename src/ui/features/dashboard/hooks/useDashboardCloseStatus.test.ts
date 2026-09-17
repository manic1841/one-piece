import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: vi.fn(function () {
    return {
      execute: (...args: unknown[]) => getFinancialPeriodMock(...args),
    };
  }),
}));

const getFinancialPeriodMock = vi.fn();

import { useDashboardCloseStatus } from './useDashboardCloseStatus';

const buildPeriod = (status: 'OPEN' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'CLOSED') => ({
  id: '2026-08',
  yearMonth: '2026-08',
  status,
  stages: {},
  reviewSourceStageId: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
});

describe('useDashboardCloseStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the previous calendar month period and maps CLOSED', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

    const { result } = renderHook(() => useDashboardCloseStatus('household-1'));

    await waitFor(() => expect(result.current.vm.glyphType).toBe('verified'));
    expect(result.current.vm.statusText).toBe('CLOSED');
    expect(result.current.vm.periodText).toBe('2026-08');
    expect(getFinancialPeriodMock).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-08',
    });
  });

  it('renders NOT STARTED when no period record exists', async () => {
    getFinancialPeriodMock.mockResolvedValue(null);

    const { result } = renderHook(() => useDashboardCloseStatus('household-1'));

    await waitFor(() => expect(result.current.vm?.glyphType).toBe('waiting'));
    expect(result.current.vm?.statusText).toBe('NOT STARTED');
  });

  it('maps NEEDS_REVIEW to the review glyph', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('NEEDS_REVIEW'));

    const { result } = renderHook(() => useDashboardCloseStatus('household-1'));

    await waitFor(() => expect(result.current.vm.glyphType).toBe('review'));
    expect(result.current.vm.statusText).toBe('NEEDS REVIEW');
  });

  it('maps IN_PROGRESS to the active glyph', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('IN_PROGRESS'));

    const { result } = renderHook(() => useDashboardCloseStatus('household-1'));

    await waitFor(() => expect(result.current.vm.glyphType).toBe('active'));
    expect(result.current.vm.statusText).toBe('IN PROGRESS');
  });

  it('does not load when householdId is missing', async () => {
    renderHook(() => useDashboardCloseStatus(undefined));

    await act(async () => {
      await Promise.resolve();
    });

    expect(getFinancialPeriodMock).not.toHaveBeenCalled();
  });
});
