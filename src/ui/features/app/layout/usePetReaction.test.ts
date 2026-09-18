import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: vi.fn(function () {
    return {
      execute: (...args: unknown[]) => getFinancialPeriodMock(...args),
    };
  }),
}));

const getFinancialPeriodMock = vi.fn();

import { usePetReaction } from './usePetReaction';

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

describe('usePetReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps a closed period to happy', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

    const { result } = renderHook(() => usePetReaction('household-1'));

    await waitFor(() => expect(result.current).toBe('happy'));
  });

  it('maps NEEDS_REVIEW to alert', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('NEEDS_REVIEW'));

    const { result } = renderHook(() => usePetReaction('household-1'));

    await waitFor(() => expect(result.current).toBe('alert'));
  });

  it('maps IN_PROGRESS to nod', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('IN_PROGRESS'));

    const { result } = renderHook(() => usePetReaction('household-1'));

    await waitFor(() => expect(result.current).toBe('nod'));
  });

  it('keeps idle for OPEN and for no period record', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('OPEN'));

    const { result: openResult } = renderHook(() => usePetReaction('household-1'));
    await waitFor(() => expect(openResult.current).toBe('idle'));

    getFinancialPeriodMock.mockResolvedValue(null);
    const { result: noRecordResult } = renderHook(() => usePetReaction('household-1'));
    await waitFor(() => expect(noRecordResult.current).toBe('idle'));
  });

  it('stays idle without a household', async () => {
    getFinancialPeriodMock.mockResolvedValue(buildPeriod('CLOSED'));

    const { result } = renderHook(() => usePetReaction(undefined));

    await waitFor(() => expect(result.current).toBe('idle'));
    expect(getFinancialPeriodMock).not.toHaveBeenCalled();
  });
});
