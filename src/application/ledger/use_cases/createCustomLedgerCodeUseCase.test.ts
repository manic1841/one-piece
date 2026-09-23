import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCustomLedgerCodeUseCase } from './createCustomLedgerCodeUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/customLedgerCodeRepository', () => ({
  customLedgerCodeRepository: {
    list: vi.fn(),
    createCustomCode: vi.fn(),
  },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

describe('createCustomLedgerCodeUseCase', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );
    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([]);
    vi.mocked(customLedgerCodeRepository.createCustomCode).mockResolvedValue(undefined);
  });

  it('derives the type from the code prefix and stamps the creator', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    await createCustomLedgerCodeUseCase.execute({
      householdId: 'household-1',
      userEmail: 'user@example.com',
      auth,
      code: 'expense:travel',
      label: '差旅費',
    });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
    expect(customLedgerCodeRepository.createCustomCode).toHaveBeenCalledWith(
      'household-1',
      {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isCustom: true,
        isActive: true,
        createdBy: 'user@example.com',
      },
      'user@example.com',
    );
  });

  it('creates a detail under an existing system category', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    await createCustomLedgerCodeUseCase.execute({
      householdId: 'household-1',
      userEmail: 'user@example.com',
      auth,
      code: 'asset:property:taipei',
      label: '台北房產',
    });

    expect(customLedgerCodeRepository.createCustomCode).toHaveBeenCalledWith(
      'household-1',
      expect.objectContaining({ code: 'asset:property:taipei', type: 'asset' }),
      'user@example.com',
    );
  });

  it('creates a detail under an active custom category', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([
      {
        code: 'expense:pets',
        label: '毛孩開銷',
        type: 'expense',
        isCustom: true,
        isActive: true,
      },
    ] as never);

    await createCustomLedgerCodeUseCase.execute({
      householdId: 'household-1',
      userEmail: 'user@example.com',
      auth,
      code: 'expense:pets:food',
      label: '飼料',
    });

    expect(customLedgerCodeRepository.createCustomCode).toHaveBeenCalledTimes(1);
  });

  it('rejects a detail whose parent is missing', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    await expect(
      createCustomLedgerCodeUseCase.execute({
        householdId: 'household-1',
        userEmail: 'user@example.com',
        auth,
        code: 'asset:land:taipei',
        label: '台北土地',
      }),
    ).rejects.toThrow('Invalid ledger code asset:land:taipei: PARENT_MISSING');

    expect(customLedgerCodeRepository.createCustomCode).not.toHaveBeenCalled();
  });

  it('rejects a detail whose parent is deactivated', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([
      {
        code: 'expense:pets',
        label: '毛孩開銷',
        type: 'expense',
        isCustom: true,
        isActive: false,
      },
    ] as never);

    await expect(
      createCustomLedgerCodeUseCase.execute({
        householdId: 'household-1',
        userEmail: 'user@example.com',
        auth,
        code: 'expense:pets:food',
        label: '飼料',
      }),
    ).rejects.toThrow('PARENT_INACTIVE');

    expect(customLedgerCodeRepository.createCustomCode).not.toHaveBeenCalled();
  });

  it('rejects a duplicate of a system code', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    await expect(
      createCustomLedgerCodeUseCase.execute({
        householdId: 'household-1',
        userEmail: 'user@example.com',
        auth,
        code: 'asset:cash',
        label: '現金',
      }),
    ).rejects.toThrow('DUPLICATE');

    expect(customLedgerCodeRepository.createCustomCode).not.toHaveBeenCalled();
  });

  it('rejects a malformed code', async () => {
    await expect(
      createCustomLedgerCodeUseCase.execute({
        householdId: 'household-1',
        userEmail: 'user@example.com',
        auth,
        code: 'expense:my stuff',
        label: '亂七八糟',
      }),
    ).rejects.toThrow('INVALID_SHAPE');
  });
});
