import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT_HISTORY_LIMIT } from '@/shared/readLimits';

import { debtSnapshotRepository } from './debtSnapshotRepository';

vi.mock('@/infra/firestore', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  limit: vi.fn((value: number) => ({ type: 'limit', value })),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
  where: vi.fn(() => ({ type: 'where' })),
  query: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: function MockTimestamp() {},
  FieldValue: function MockFieldValue() {},
}));

describe('debtSnapshotRepository.listByYearMonthRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('不管期間多長都帶上限，截斷落在最舊的一端', async () => {
    const list = vi.spyOn(debtSnapshotRepository, 'list').mockResolvedValue([]);

    await debtSnapshotRepository.listByYearMonthRange(
      'household-1',
      'debt-1',
      '1990-01',
      '2026-12',
    );

    const constraints = list.mock.calls[0]?.[1] ?? [];
    expect(constraints).toEqual([
      { type: 'where' },
      { type: 'where' },
      { type: 'orderBy' },
      { type: 'limit', value: SNAPSHOT_HISTORY_LIMIT },
    ]);
  });
});
