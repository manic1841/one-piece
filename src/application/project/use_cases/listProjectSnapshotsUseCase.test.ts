import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

import { listProjectSnapshotsUseCase } from './listProjectSnapshotsUseCase';

vi.mock('@/infra/repositories/projectSnapshotRepository', () => ({
  projectSnapshotRepository: { get: vi.fn(), list: vi.fn() },
}));

const snapshot = (id: string) => {
  const [year, month] = id.split('-').map(Number);
  return {
    id,
    year,
    month,
    openingBalance: 0,
    income: 0,
    expense: 0,
    closingBalance: 0,
  };
};

describe('listProjectSnapshotsUseCase — window trimming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims the over-selected edge years down to the exact months', async () => {
    vi.mocked(projectSnapshotRepository.list).mockResolvedValue([
      snapshot('2025-12'),
      snapshot('2024-11'),
      snapshot('2026-01'),
      snapshot('2026-02'),
      snapshot('2026-03'),
      snapshot('2027-04'),
    ] as never);

    const result = await listProjectSnapshotsUseCase.execute({
      householdId: 'h1',
      projectId: 'p1',
      fromYearMonth: '2025-12',
      toYearMonth: '2026-02',
    });

    expect(result.map((item) => item.id)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('trims before applying the limit so edge years cannot hide in-range rows', async () => {
    vi.mocked(projectSnapshotRepository.list).mockResolvedValue([
      snapshot('2027-04'),
      snapshot('2026-02'),
      snapshot('2026-01'),
      snapshot('2025-12'),
    ] as never);

    const result = await listProjectSnapshotsUseCase.execute({
      householdId: 'h1',
      projectId: 'p1',
      fromYearMonth: '2025-12',
      toYearMonth: '2026-02',
      limit: 2,
    });

    expect(result.map((item) => item.id)).toEqual(['2026-02', '2026-01']);
  });

  it('returns the single snapshot directly when asked for one month', async () => {
    vi.mocked(projectSnapshotRepository.get).mockResolvedValue(snapshot('2026-01') as never);

    const result = await listProjectSnapshotsUseCase.execute({
      householdId: 'h1',
      projectId: 'p1',
      yearMonth: '2026-01',
    });

    expect(result.map((item) => item.id)).toEqual(['2026-01']);
    expect(projectSnapshotRepository.list).not.toHaveBeenCalled();
  });
});
