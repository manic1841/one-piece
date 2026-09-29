import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';

import { useCompletenessCheckStage } from './useCompletenessCheckStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/settlement/use_cases/checkSettlementCompletenessUseCase', () => ({
  checkSettlementCompletenessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));

const mockCompleteness = vi.mocked(checkSettlementCompletenessUseCase.execute);
const mockReadiness = vi.mocked(getSettlementReadinessUseCase.execute);

const readinessFixture = {
  year: 2026,
  month: 8,
  isReady: true,
  totalAccounts: 2,
  totalPortfolios: 0,
  totalDebts: 0,
  totalProjects: 0,
  unsettledAccounts: [],
  unsettledPortfolios: [],
  unsettledDebts: [],
  unsettledProjects: [],
  totalUnsettled: 0,
};

const anomaly = {
  targetType: 'PROJECT',
  targetId: 'project-1',
  name: '裝修',
  status: 'ZERO_ACTIVITY',
  activityCount: 0,
  activityAmount: 0,
} as never;

const renderStage = (yearMonth = '2026-08') =>
  renderHook(
    ({ ym }: { ym: string }) =>
      useCompletenessCheckStage({
        householdId: 'household-1',
        selectedYearMonth: ym,
        confirmingStageId: null,
      }),
    { initialProps: { ym: yearMonth } },
  );

describe('useCompletenessCheckStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteness.mockResolvedValue({
      yearMonth: '2026-08',
      activities: [],
      anomalies: [anomaly],
    });
    mockReadiness.mockResolvedValue(readinessFixture);
  });

  it('owns the anomalies and the readiness Step 7 aggregates', async () => {
    const { result } = renderStage();

    await waitFor(() => expect(result.current.readiness?.isReady).toBe(true));
    expect(result.current.anomalies).toEqual([anomaly]);
  });

  it('clears the evidence on a month switch before the new month loads', async () => {
    const { result, rerender } = renderStage();
    await waitFor(() => expect(result.current.readiness).not.toBeNull());

    mockReadiness.mockReturnValue(new Promise(() => {}));
    act(() => rerender({ ym: '2026-09' }));

    expect(result.current.readiness).toBeNull();
    expect(result.current.anomalies).toEqual([]);
  });

  it('exposes refresh so a confirm rebuilds the evidence', async () => {
    const { result } = renderStage();
    await waitFor(() => expect(result.current.readiness).not.toBeNull());

    mockReadiness.mockResolvedValue({ ...readinessFixture, isReady: false, totalUnsettled: 1 });
    await act(() => result.current.refresh?.());

    expect(result.current.readiness?.isReady).toBe(false);
  });

  it('surfaces the canned message instead of reporting a clean month on failure', async () => {
    mockReadiness.mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入結算就緒狀態，請稍後再試。'),
    );
    expect(result.current.readiness).toBeNull();
    expect(result.current.anomalies).toEqual([]);
  });

  it('keeps the previous evidence on a same-month refresh failure but flags the error (#226)', async () => {
    const { result } = renderStage();
    await waitFor(() => expect(result.current.readiness).not.toBeNull());

    mockReadiness.mockRejectedValue(new Error('boom'));
    await act(() => result.current.refresh?.());

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入結算就緒狀態，請稍後再試。'),
    );
    // Stale values stay on screen by design (no flash-empty), which is exactly
    // why consumers must gate on the error rather than on the data.
    expect(result.current.readiness).not.toBeNull();
  });
});
