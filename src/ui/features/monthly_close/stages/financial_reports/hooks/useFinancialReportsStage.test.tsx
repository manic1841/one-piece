import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';

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
  });

  it('loads the persistence state for the selected month', async () => {
    vi.mocked(getReportPersistenceStateUseCase.execute).mockResolvedValue({
      isPersisted: true,
      timestamps: {},
    });

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));
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
  });

  it('reloads the persistence state through refresh()', async () => {
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

    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.reportsPersisted).toBe(true);
    expect(getReportPersistenceStateUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
