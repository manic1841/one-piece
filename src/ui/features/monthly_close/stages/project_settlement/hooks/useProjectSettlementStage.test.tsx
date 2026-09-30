import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';

import { useProjectSettlementStage } from './useProjectSettlementStage';

vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn() },
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

  it('loads each active project with its settlement state', async () => {
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([
      { id: 'project-1', name: '裝修', isActive: true },
      { id: 'project-2', name: '旅遊', isActive: false },
    ] as never);
    vi.mocked(listProjectSnapshotsUseCase.execute).mockResolvedValue([
      { income: 5_000, expense: 3_000, closingBalance: 2_000 },
    ] as never);

    const { result } = renderStage();

    await waitFor(() => expect(result.current.settlements).toHaveLength(1));
    expect(result.current.settlements[0]).toMatchObject({
      projectId: 'project-1',
      settled: true,
      closingBalance: 2_000,
    });
    expect(result.current.errorMessage).toBeNull();
  });

  // #231: a failed load used to leave an empty list that read as "no projects".
  // The hook reports it with copy the consumer owns, and confirm stays reachable
  // — the stage has no draft, so there is nothing for the failure to gate.
  it('surfaces the canned copy on load failure without blocking confirm', async () => {
    vi.mocked(listProjectsUseCase.execute).mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入專案結算狀態，請稍後再試。'),
    );
    expect(result.current.settlements).toEqual([]);
    expect(result.current.shouldBlock()).toBeNull();
  });
});
