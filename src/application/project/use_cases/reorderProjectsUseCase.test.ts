import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReorderCommandErrorCode } from '@/application/common/reorderErrors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { projectRepository } from '@/infra/repositories/projectRepository';

import { reorderProjectsUseCase } from './reorderProjectsUseCase';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    runTransaction: vi.fn(async (_db, callback: (tx: object) => Promise<unknown>) =>
      callback({
        get: vi.fn(async (ref: { id?: string }) => ({
          exists: () => !ref?.id?.includes('missing'),
        })),
        update: vi.fn(),
      }),
    ),
    doc: vi.fn((_parent, ...segments: string[]) => ({ id: segments[segments.length - 1] })),
  };
});

vi.mock('@/firebase', () => ({ db: {} }));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: {
    update: vi.fn(),
    getDocRefById: vi.fn((_householdId: string, id: string) => ({ id })),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

describe('reorderProjectsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('applies the full ordering through one transactional write path', async () => {
    await reorderProjectsUseCase.execute({
      householdId: 'household-1',
      projectOrders: [
        { id: 'project-2', order: 0 },
        { id: 'project-1', order: 1 },
      ],
      userEmail: 'user@example.com',
      auth,
    });

    expect(projectRepository.update).not.toHaveBeenCalled();
  });

  it('returns success for an empty order list without touching the database', async () => {
    await reorderProjectsUseCase.execute({
      householdId: 'household-1',
      projectOrders: [],
      userEmail: 'user@example.com',
      auth,
    });

    expect(projectRepository.update).not.toHaveBeenCalled();
  });

  it('propagates permission rejections without touching the database', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      reorderProjectsUseCase.execute({
        householdId: 'household-1',
        projectOrders: [{ id: 'project-1', order: 0 }],
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toThrow('denied');
  });

  it('rejects duplicate target ids with INVALID_ORDERS', async () => {
    await expect(
      reorderProjectsUseCase.execute({
        householdId: 'household-1',
        projectOrders: [
          { id: 'project-1', order: 0 },
          { id: 'project-1', order: 1 },
        ],
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: ReorderCommandErrorCode.INVALID_ORDERS });
  });

  it('rejects missing targets with TARGET_NOT_FOUND', async () => {
    await expect(
      reorderProjectsUseCase.execute({
        householdId: 'household-1',
        projectOrders: [{ id: 'missing-project', order: 0 }],
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: ReorderCommandErrorCode.TARGET_NOT_FOUND });
  });

  it('wraps transaction failures with TRANSACTION_FAILED', async () => {
    const { runTransaction } = await import('firebase/firestore');
    vi.mocked(runTransaction).mockRejectedValueOnce(new Error('write failed'));

    await expect(
      reorderProjectsUseCase.execute({
        householdId: 'household-1',
        projectOrders: [{ id: 'project-1', order: 0 }],
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: ReorderCommandErrorCode.TRANSACTION_FAILED });
  });
});
