import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { previewProjectSettlementsUseCase } from '@/application/settlement/use_cases/previewProjectSettlementsUseCase';
import { useAuth } from '@/infra/contexts/useAuth';

import { DialogStatus, useSettlementDialog } from './useSettlementDialog';

vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/settlement/use_cases/previewProjectSettlementsUseCase', () => ({
  previewProjectSettlementsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/settlement/use_cases/settleProjectsUseCase', () => ({
  settleProjectsUseCase: { execute: vi.fn() },
}));
vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

const project = { id: 'p1', name: '媽媽專案' };

// The mocked use case returns the application DTO (CompletenessActivity); the
// gate maps it to a VM (adds key, drops status) before it reaches the hook API.
const zeroActivityDto = {
  targetType: 'PROJECT' as const,
  targetId: 'p1',
  name: '媽媽專案',
  status: 'ZERO_ACTIVITY' as const,
  activityCount: 0,
  activityAmount: 0,
};

const zeroActivityVM = {
  key: 'PROJECT:p1',
  targetType: 'PROJECT' as const,
  targetId: 'p1',
  name: '媽媽專案',
  activityCount: 0,
  activityAmount: 0,
};

const anomaliesResult = {
  yearMonth: '2026-09',
  activities: [zeroActivityDto],
  anomalies: [zeroActivityDto],
};

const emptyResult = { yearMonth: '2026-09', activities: [], anomalies: [] };

vi.mocked(useAuth).mockReturnValue({
  userProfile: { householdId: 'household-1' },
  currentUser: { uid: 'user-1', email: 'user@example.com' },
  isAdmin: false,
  loading: false,
  logout: vi.fn(),
  loginWithGoogle: vi.fn(),
  refreshProfile: vi.fn(),
} as never);

describe('useSettlementDialog completeness gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue(emptyResult);
    vi.mocked(previewProjectSettlementsUseCase.execute).mockResolvedValue([
      {
        projectId: 'p1',
        projectName: '媽媽專案',
        openingBalance: 0,
        income: 10,
        expense: 5,
        closingBalance: 5,
      },
    ] as never);
  });

  it('runs the completeness check automatically on mount', async () => {
    renderHook(() => useSettlementDialog('household-1', [project], 'user@example.com'));

    await waitFor(() => {
      expect(checkSettlementCompletenessUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ householdId: 'household-1' }),
      );
    });
  });

  it('goes straight to preview with zero clicks when nothing is anomalous', async () => {
    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    await waitFor(() => expect(checkSettlementCompletenessUseCase.execute).toHaveBeenCalled());

    await act(async () => {
      await result.current.toPreview();
    });

    expect(result.current.status).toBe(DialogStatus.PREVIEW);
    expect(result.current.pendingAnomalies).toEqual([]);
  });

  it('blocks the transition and surfaces anomalies until each is confirmed', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue(anomaliesResult);

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([zeroActivityVM]));

    await act(async () => {
      await result.current.toPreview();
    });

    expect(result.current.status).toBe(DialogStatus.SELECTION);
    expect(previewProjectSettlementsUseCase.execute).not.toHaveBeenCalled();

    await act(async () => {
      result.current.confirmAnomaly('PROJECT', 'p1');
    });
    expect(result.current.pendingAnomalies).toEqual([]);

    await act(async () => {
      await result.current.toPreview();
    });
    expect(result.current.status).toBe(DialogStatus.PREVIEW);
  });

  it('keeps confirmed anomalies out of the way for the rest of the session', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue(anomaliesResult);

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([zeroActivityVM]));

    act(() => result.current.confirmAnomaly('PROJECT', 'p1'));
    expect(result.current.pendingAnomalies).toEqual([]);

    // Simulate a re-check within the same session (e.g. year/month tweak).
    await act(async () => {
      result.current.setMonth(8);
    });
    await waitFor(() =>
      expect(checkSettlementCompletenessUseCase.execute).toHaveBeenCalledTimes(2),
    );
    expect(result.current.pendingAnomalies).toEqual([]);
  });

  it('re-runs the check after reopening (close resets the session)', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockResolvedValue(anomaliesResult);

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([zeroActivityVM]));
    act(() => result.current.confirmAnomaly('PROJECT', 'p1'));
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([]));

    act(() => result.current.close());
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([zeroActivityVM]));
  });

  it('lets a newer check win over a slower in-flight one', async () => {
    let resolveStale: (value: typeof anomaliesResult) => void = () => {};
    let calls = 0;
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return new Promise((resolve) => {
          resolveStale = resolve;
        });
      }
      return Promise.resolve(emptyResult);
    });

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    // Second check (newer) resolves clean; the first is still pending.
    await act(async () => {
      result.current.setMonth(8);
    });
    await waitFor(() => expect(result.current.pendingAnomalies).toEqual([]));

    // The stale first check finally resolves with an anomaly; it must not revive.
    await act(async () => {
      resolveStale(anomaliesResult);
      await Promise.resolve();
    });
    expect(result.current.pendingAnomalies).toEqual([]);
  });

  it('does not block settlement when the check itself fails', async () => {
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockRejectedValue(
      new Error('Permission denied'),
    );

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );
    await waitFor(() => expect(result.current.completenessError).toBe('Permission denied'));

    await act(async () => {
      await result.current.toPreview();
    });

    expect(result.current.status).toBe(DialogStatus.PREVIEW);
  });

  it('waits for an in-flight check before letting toPreview through', async () => {
    let resolveCheck: (value: {
      yearMonth: string;
      activities: unknown[];
      anomalies: unknown[];
    }) => void = () => {};
    vi.mocked(checkSettlementCompletenessUseCase.execute).mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useSettlementDialog('household-1', [project], 'user@example.com'),
    );

    let previewDone = false;
    act(() => {
      result.current.toPreview().then(() => {
        previewDone = true;
      });
    });

    await act(async () => {
      resolveCheck({
        yearMonth: '2026-09',
        activities: [zeroActivityDto],
        anomalies: [zeroActivityDto],
      });
      await Promise.resolve();
    });

    expect(previewDone).toBe(true);
    expect(result.current.status).toBe(DialogStatus.SELECTION);
    expect(result.current.pendingAnomalies).toEqual([zeroActivityVM]);
  });
});
