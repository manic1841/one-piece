import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transactionRepository } from './transactionRepository';

vi.mock('@/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  documentId: vi.fn(() => '__documentId__'),
  where: vi.fn((...args: unknown[]) => ({ type: 'where', args })),
  query: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: { fromDate: vi.fn(() => ({})) },
  updateDoc: vi.fn(),
}));

describe('transactionRepository.getByIds — chunking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for empty input', async () => {
    const result = await transactionRepository.getByIds('household-1', []);
    expect(result).toEqual([]);
  });

  it('chunks IDs by 30 (Firestore in limit)', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `tx-${i}`);
    const listSpy = vi
      .spyOn(transactionRepository, 'list')
      .mockResolvedValue([]);

    await transactionRepository.getByIds('household-1', ids);

    // 65 IDs → 3 chunks (30 + 30 + 5)
    expect(listSpy).toHaveBeenCalledTimes(3);
  });

  it('uses a single query for 30 or fewer IDs', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `tx-${i}`);
    const listSpy = vi
      .spyOn(transactionRepository, 'list')
      .mockResolvedValue([]);

    await transactionRepository.getByIds('household-1', ids);

    expect(listSpy).toHaveBeenCalledTimes(1);
  });
});
