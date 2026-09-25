import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/repositories/watchListRepository', () => ({
  watchListRepository: {
    listTargets: vi.fn(),
    addTarget: vi.fn(),
    removeTarget: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
    assertWritePermission: vi.fn(),
  },
}));

const householdId = 'household-1';
const auth = { uid: 'user-1', email: 'user@test.com' };

describe('listWatchListUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks read permission then returns the list', async () => {
    const { listWatchListUseCase } = await import('./listWatchListUseCase');
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    const targets = [
      {
        id: 'PROJECT:p1',
        targetType: 'PROJECT',
        targetId: 'p1',
        name: '媽媽專案',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedBy: 'user-1',
        updatedAt: new Date(),
      },
    ];
    vi.mocked(watchListRepository.listTargets).mockResolvedValue(targets);

    const result = await listWatchListUseCase.execute({ householdId, auth });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    expect(watchListRepository.listTargets).toHaveBeenCalledWith(householdId);
    expect(result).toEqual(targets);
  });
});

describe('addWatchListTargetUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks write permission then persists the target with a name snapshot', async () => {
    const { addWatchListTargetUseCase } = await import('./addWatchListTargetUseCase');
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    const target = { targetType: 'PROJECT' as const, targetId: 'p1', name: '媽媽專案' };

    await addWatchListTargetUseCase.execute({
      householdId,
      auth,
      userEmail: auth.email ?? '',
      target,
    });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    expect(watchListRepository.addTarget).toHaveBeenCalledWith(householdId, target, auth.email);
  });

  it('propagates repository errors (no silent failure)', async () => {
    const { addWatchListTargetUseCase } = await import('./addWatchListTargetUseCase');
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');

    vi.mocked(watchListRepository.addTarget).mockRejectedValue(new Error('network down'));

    await expect(
      addWatchListTargetUseCase.execute({
        householdId,
        auth,
        userEmail: auth.email ?? '',
        target: { targetType: 'LEDGER_CODE', targetId: 'expense:travel', name: '差旅費' },
      }),
    ).rejects.toThrow('network down');
  });
});

describe('removeWatchListTargetUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks write permission then deletes by type + id', async () => {
    const { removeWatchListTargetUseCase } = await import('./removeWatchListTargetUseCase');
    const { watchListRepository } = await import('@/infra/repositories/watchListRepository');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    await removeWatchListTargetUseCase.execute({
      householdId,
      auth,
      targetType: 'DEBT_ACCOUNT',
      targetId: 'debt-1',
    });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    expect(watchListRepository.removeTarget).toHaveBeenCalledWith(
      householdId,
      'DEBT_ACCOUNT',
      'debt-1',
    );
  });
});
