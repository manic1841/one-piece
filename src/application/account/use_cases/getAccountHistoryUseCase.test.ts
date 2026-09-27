import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AccountSnapshot } from '@/domains/account/types/account';

import { getAccountHistoryUseCase } from './getAccountHistoryUseCase';
import { getAccountSnapshotsUseCase } from './getAccountSnapshotsUseCase';

vi.mock('./getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

const snapshot = (year: number, month: number): AccountSnapshot =>
  ({
    id: `${year}-${String(month).padStart(2, '0')}`,
    accountId: 'account-1',
    year,
    month,
    amount: 1000 + month,
  }) as AccountSnapshot;

describe('getAccountHistoryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest 12 snapshots sorted oldest to newest', async () => {
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([
      snapshot(2026, 9),
      snapshot(2025, 10),
      snapshot(2026, 1),
    ]);

    const result = await getAccountHistoryUseCase.execute({
      householdId: 'household-1',
      accountId: 'account-1',
      auth,
    });

    expect(result.map((item) => `${item.year}-${item.month}`)).toEqual([
      '2025-10',
      '2026-1',
      '2026-9',
    ]);
  });

  it('caps the window at 12 months ending at the latest snapshot', async () => {
    const months = Array.from({ length: 15 }, (_, index) => {
      const monthsBack = 14 - index;
      const absoluteMonth = 2026 * 12 + (9 - 1) - monthsBack;
      return snapshot(Math.floor(absoluteMonth / 12), (absoluteMonth % 12) + 1);
    });
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue(months);

    const result = await getAccountHistoryUseCase.execute({
      householdId: 'household-1',
      accountId: 'account-1',
      auth,
    });

    expect(result).toHaveLength(12);
    expect(result[11].year).toBe(2026);
    expect(result[11].month).toBe(9);
  });

  it('returns an empty array when no snapshots exist', async () => {
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);

    const result = await getAccountHistoryUseCase.execute({
      householdId: 'household-1',
      accountId: 'account-1',
      auth,
    });

    expect(result).toEqual([]);
  });

  it('passes the household and account through to the snapshots use case', async () => {
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);

    await getAccountHistoryUseCase.execute({
      householdId: 'household-1',
      accountId: 'account-1',
      auth,
    });

    expect(getAccountSnapshotsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      accountId: 'account-1',
      auth,
    });
  });
});
