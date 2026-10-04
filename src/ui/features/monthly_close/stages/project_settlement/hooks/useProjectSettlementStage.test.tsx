import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { previewProjectSettlementsUseCase } from '@/application/settlement/use_cases/previewProjectSettlementsUseCase';

import { useProjectSettlementStage } from './useProjectSettlementStage';

vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/settlement/use_cases/previewProjectSettlementsUseCase', () => ({
  previewProjectSettlementsUseCase: { execute: vi.fn() },
}));

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

const renderStage = () =>
  renderHook(() =>
    useProjectSettlementStage({
      householdId: 'household-1',
      selectedYearMonth: '2026-08',
      confirmingStageId: null,
    }),
  );

describe('useProjectSettlementStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads each active project with its live preview and persisted flag', async () => {
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([
      { id: 'project-1', name: '裝修', isActive: true },
      { id: 'project-2', name: '旅遊', isActive: false },
    ] as never);
    vi.mocked(previewProjectSettlementsUseCase.execute).mockResolvedValue([
      {
        projectId: 'project-1',
        projectName: '裝修',
        openingBalance: 1_000,
        income: 5_000,
        expense: 3_000,
        closingBalance: 3_000,
      },
    ] as never);
    vi.mocked(listProjectSnapshotsUseCase.execute).mockResolvedValue([
      { income: 5_000, expense: 3_000, closingBalance: 3_000 },
    ] as never);

    const { result } = renderStage();

    await waitFor(() => expect(result.current.settlements).toHaveLength(1));
    // Only the active project is previewed, and with its previous balance.
    expect(previewProjectSettlementsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ projects: [{ id: 'project-1', name: '裝修' }] }),
    );
    expect(result.current.settlements[0]).toMatchObject({
      projectId: 'project-1',
      settled: true,
      openingBalance: 1_000,
      income: 5_000,
      expense: 3_000,
      closingBalance: 3_000,
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it('reports an unsettled project without a persisted month snapshot', async () => {
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([
      { id: 'project-1', name: '裝修', isActive: true },
    ] as never);
    vi.mocked(previewProjectSettlementsUseCase.execute).mockResolvedValue([
      {
        projectId: 'project-1',
        projectName: '裝修',
        openingBalance: 0,
        income: 0,
        expense: 0,
        closingBalance: 0,
      },
    ] as never);
    vi.mocked(listProjectSnapshotsUseCase.execute).mockResolvedValue([] as never);

    const { result } = renderStage();

    await waitFor(() => expect(result.current.settlements).toHaveLength(1));
    expect(result.current.settlements[0]?.settled).toBe(false);
  });

  // #231: a failed load used to leave an empty list that read as "no projects".
  // The hook reports it with copy the consumer owns; the failure never leaks a
  // rejection, and the stage still builds its request (no draft to gate).
  it('reports a load failure without blocking confirm or leaking a rejection', async () => {
    vi.mocked(listProjectsUseCase.execute).mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入專案結算狀態，請稍後再試。'),
    );
    expect(result.current.settlements).toEqual([]);
    expect(result.current.buildRequest()).toEqual({ stageId: 'PROJECT_SETTLEMENT' });

    // The failed load settles instead of escaping as an unhandled rejection.
    await expect(result.current.refresh?.()).resolves.toBeUndefined();
  });
});
