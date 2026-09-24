import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtSnapshotsUseCase } from './listDebtSnapshotsUseCase';
import { type DebtSnapshot } from '@/domains/debt/schemas';

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    listByYearMonthRange: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

describe('listDebtSnapshotsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the requested month range for the given debt account', async () => {
    const { debtSnapshotRepository } = await import(
      '@/infra/repositories/debtSnapshotRepository'
    );
    vi.mocked(debtSnapshotRepository.listByYearMonthRange).mockResolvedValue([]);

    const result = await listDebtSnapshotsUseCase.execute({
      householdId: 'household-1',
      debtAccountId: 'debt-1',
      startYearMonth: '2025-10',
      endYearMonth: '2026-09',
      auth,
    });

    expect(debtSnapshotRepository.listByYearMonthRange).toHaveBeenCalledWith(
      'household-1',
      'debt-1',
      '2025-10',
      '2026-09',
    );
    expect(result).toEqual([]);
  });

  it('returns the snapshots the repository provided', async () => {
    const { debtSnapshotRepository } = await import(
      '@/infra/repositories/debtSnapshotRepository'
    );
    const snapshots = [{ yearMonth: '2026-09' }] as unknown as DebtSnapshot[];
    vi.mocked(debtSnapshotRepository.listByYearMonthRange).mockResolvedValue(snapshots);

    const result = await listDebtSnapshotsUseCase.execute({
      householdId: 'household-1',
      debtAccountId: 'debt-1',
      startYearMonth: '2026-09',
      endYearMonth: '2026-09',
      auth,
    });

    expect(result).toBe(snapshots);
  });

  it('asserts read permission before touching the repository', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { debtSnapshotRepository } = await import(
      '@/infra/repositories/debtSnapshotRepository'
    );

    await listDebtSnapshotsUseCase.execute({
      householdId: 'household-1',
      debtAccountId: 'debt-1',
      startYearMonth: '2026-01',
      endYearMonth: '2026-09',
      auth,
    });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'u1',
      false,
    );
    expect(debtSnapshotRepository.listByYearMonthRange).toHaveBeenCalled();
  });

  it('does not read snapshots when the caller is not permitted', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { debtSnapshotRepository } = await import(
      '@/infra/repositories/debtSnapshotRepository'
    );
    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValueOnce(
      new Error('Permission denied'),
    );

    await expect(
      listDebtSnapshotsUseCase.execute({
        householdId: 'household-1',
        debtAccountId: 'debt-1',
        startYearMonth: '2026-01',
        endYearMonth: '2026-09',
        auth,
      }),
    ).rejects.toThrow('Permission denied');

    expect(debtSnapshotRepository.listByYearMonthRange).not.toHaveBeenCalled();
  });
});
