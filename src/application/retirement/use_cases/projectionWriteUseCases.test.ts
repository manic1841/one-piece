import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

import { deleteProjectionUseCase } from './deleteProjectionUseCase';
import { renameProjectionNameUseCase } from './renameProjectionNameUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn() },
}));

vi.mock('@/infra/repositories/projectionRepository', () => ({
  projectionRepository: { deleteProjection: vi.fn(), renameProjectionName: vi.fn() },
}));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

describe('deleteProjectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('asserts write permission before deleting', async () => {
    vi.mocked(projectionRepository.deleteProjection).mockResolvedValue();

    await deleteProjectionUseCase.execute({ householdId: 'h1', projectionId: 'p1', auth });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      'h1',
      'u1',
      false,
    );
    expect(projectionRepository.deleteProjection).toHaveBeenCalledWith('h1', 'p1');
  });
});

describe('renameProjectionNameUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('trims the name and writes only that field', async () => {
    vi.mocked(projectionRepository.renameProjectionName).mockResolvedValue();

    const result = await renameProjectionNameUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      name: '  New name  ',
      auth,
    });

    expect(result).toEqual({ ok: true, name: 'New name' });
    expect(projectionRepository.renameProjectionName).toHaveBeenCalledWith('h1', 'p1', 'New name');
  });

  it('rejects a blank name without writing', async () => {
    const result = await renameProjectionNameUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      name: '   ',
      auth,
    });

    expect(result).toEqual({ ok: false, code: 'NAME_REQUIRED' });
    expect(projectionRepository.renameProjectionName).not.toHaveBeenCalled();
  });

  it('rejects an over-long name', async () => {
    const result = await renameProjectionNameUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      name: 'x'.repeat(101),
      auth,
    });

    expect(result).toEqual({ ok: false, code: 'NAME_TOO_LONG' });
    expect(projectionRepository.renameProjectionName).not.toHaveBeenCalled();
  });

  it('checks permission before validating the name', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      renameProjectionNameUseCase.execute({
        householdId: 'h1',
        projectionId: 'p1',
        name: '   ',
        auth,
      }),
    ).rejects.toThrow('denied');
  });
});
