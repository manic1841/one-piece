import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';

import { listAllLedgerCodesUseCase } from './listAllLedgerCodesUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/customLedgerCodeRepository', () => ({
  customLedgerCodeRepository: {
    list: vi.fn(),
    listActive: vi.fn(),
  },
}));

const SYSTEM_CODE_COUNT = Object.values(LEDGER_CODES).length;

describe('listAllLedgerCodesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns system codes plus active custom codes and checks permission', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.listActive).mockResolvedValue([
      {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isCustom: true,
        isActive: true,
      },
    ] as never);

    const result = await listAllLedgerCodesUseCase.execute({
      householdId: 'household-1',
      auth: { uid: 'user-1', isGlobalAdmin: false },
      labelResolver: (code: string) => `resolved:${code}`,
    });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
    expect(customLedgerCodeRepository.listActive).toHaveBeenCalledWith('household-1');
    expect(customLedgerCodeRepository.list).not.toHaveBeenCalled();
    expect(result).toHaveLength(SYSTEM_CODE_COUNT + 1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'asset:cash',
          label: 'resolved:asset:cash',
          isCustom: false,
          isActive: true,
        }),
        expect.objectContaining({ code: 'expense:travel', label: '差旅費', isCustom: true }),
      ]),
    );
  });

  it('resolves the label through the resolver when a custom code has none', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.listActive).mockResolvedValue([
      {
        code: 'expense:travel',
        label: '',
        type: 'expense',
        isCustom: true,
        isActive: true,
      },
    ] as never);

    const result = await listAllLedgerCodesUseCase.execute({
      householdId: 'household-1',
      auth: { uid: 'user-1', isGlobalAdmin: false },
      labelResolver: (code: string) => `resolved:${code}`,
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'expense:travel', label: 'resolved:expense:travel' }),
      ]),
    );
  });

  it('includes inactive custom codes when requested', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([
      {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isCustom: true,
        isActive: false,
      },
    ] as never);

    const result = await listAllLedgerCodesUseCase.execute({
      householdId: 'household-1',
      includeInactive: true,
      auth: { uid: 'user-1', isGlobalAdmin: false },
      labelResolver: (code: string) => `resolved:${code}`,
    });

    expect(customLedgerCodeRepository.list).toHaveBeenCalledWith(['household-1']);
    expect(customLedgerCodeRepository.listActive).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'expense:travel', isActive: false }),
      ]),
    );
  });

  it('propagates permission errors instead of failing silently', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValue(
      new Error('Permission denied'),
    );

    await expect(
      listAllLedgerCodesUseCase.execute({
        householdId: 'household-1',
        auth: { uid: 'user-1', isGlobalAdmin: false },
        labelResolver: (code: string) => code,
      }),
    ).rejects.toThrow('Permission denied');
  });
});
