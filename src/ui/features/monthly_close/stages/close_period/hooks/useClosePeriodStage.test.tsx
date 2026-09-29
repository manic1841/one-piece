import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';

import { useClosePeriodStage } from './useClosePeriodStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));
vi.mock('@/application/report/use_cases/getStoredReportsBundleUseCase', () => ({
  getStoredReportsBundleUseCase: { execute: vi.fn() },
}));

const previewFixture = (netIncome: number) => ({ incomeStatement: { netIncome } }) as never;

const renderStage = (yearMonth = '2026-08') =>
  renderHook(
    ({ ym }: { ym: string }) =>
      useClosePeriodStage({
        householdId: 'household-1',
        selectedYearMonth: ym,
        confirmingStageId: null,
      }),
    { initialProps: { ym: yearMonth } },
  );

describe('useClosePeriodStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(null as never);
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue({
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    });
  });

  it('loads the live preview bundle regardless of persistence', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(1500));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.reportBundle).toEqual({ incomeStatement: { netIncome: 1500 } }),
    );
    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 8 }),
    );
  });

  it('loads the persisted bundle for drift comparison', async () => {
    vi.mocked(getStoredReportsBundleUseCase.execute).mockResolvedValue({
      incomeStatement: { netIncome: 1200 },
      balanceSheet: null,
      cashFlow: null,
    } as never);

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.persistedBundle).toEqual({
        incomeStatement: { netIncome: 1200 },
        balanceSheet: null,
        cashFlow: null,
      }),
    );
    expect(getStoredReportsBundleUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ yearMonth: '2026-08' }),
    );
  });

  it('clears the bundle on a month switch before the new month loads', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(1500));

    const { result, rerender } = renderStage('2026-08');
    await waitFor(() => expect(result.current.reportBundle).not.toBeNull());

    let resolveNewMonth: (value: never) => void = () => {};
    vi.mocked(previewFinancialReportsWorkflow.execute).mockReturnValue(
      new Promise((resolve) => {
        resolveNewMonth = resolve;
      }) as never,
    );

    rerender({ ym: '2026-09' });

    await waitFor(() => expect(result.current.reportBundle).toBeNull());

    await act(async () => {
      resolveNewMonth(previewFixture(300));
    });
    await waitFor(() =>
      expect(result.current.reportBundle).toEqual({ incomeStatement: { netIncome: 300 } }),
    );
  });

  it('reloads the bundle through refresh()', async () => {
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(0));

    const { result } = renderStage();
    await waitFor(() => expect(result.current.reportBundle).not.toBeNull());

    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewFixture(300));

    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.reportBundle).toEqual({ incomeStatement: { netIncome: 300 } });
    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledTimes(2);
  });
});
