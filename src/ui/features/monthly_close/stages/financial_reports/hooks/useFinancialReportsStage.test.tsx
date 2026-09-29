import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';

import { useFinancialReportsStage } from './useFinancialReportsStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));

const renderStage = (yearMonth = '2026-08') =>
  renderHook(
    ({ ym }: { ym: string }) =>
      useFinancialReportsStage({
        householdId: 'household-1',
        selectedYearMonth: ym,
        confirmingStageId: null,
      }),
    { initialProps: { ym: yearMonth } },
  );

describe('useFinancialReportsStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(null as never);
  });

  it('loads persistence and the preview bundle for the selected month', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue({
      cashFlow: { adjustment: 1500 },
    } as never);

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));
    expect(result.current.reportBundle).toEqual({ cashFlow: { adjustment: 1500 } });
    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 8 }),
    );
  });

  it('clears the persistence state on a month switch before the new month loads', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });

    const { result, rerender } = renderStage('2026-08');
    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));

    let resolveNewMonth: (value: { isPersisted: boolean; timestamps: object }) => void = () => {};
    vi.mocked(getReportPersistenceStateUseCase.execute).mockReturnValue(
      new Promise((resolve) => {
        resolveNewMonth = resolve;
      }) as never,
    );

    rerender({ ym: '2026-09' });

    await waitFor(() => expect(result.current.reportsPersisted).toBeNull());

    await act(async () => {
      resolveNewMonth({ isPersisted: false, timestamps: {} });
    });
    await waitFor(() => expect(result.current.reportsPersisted).toBe(false));
    expect(result.current.reportBundle).toBeNull();
  });

  it('reloads persistence and the bundle through refresh()', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: false,
      timestamps: {},
    });

    const { result } = renderStage();
    await waitFor(() => expect(result.current.reportsPersisted).toBe(false));

    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue({
      cashFlow: { adjustment: 300 },
    } as never);

    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.reportsPersisted).toBe(true);
    expect(result.current.reportBundle).toEqual({ cashFlow: { adjustment: 300 } });
    expect(getReportPersistenceStateUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
