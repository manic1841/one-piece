import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listCustomLedgerCodesUseCase } from './listCustomLedgerCodesUseCase';

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

describe('listCustomLedgerCodesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only active custom ledger codes by default', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.listActive).mockResolvedValue([
      { code: 'expense:travel' },
    ] as never);

    const result = await listCustomLedgerCodesUseCase.execute({
      householdId: 'household-1',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
    expect(customLedgerCodeRepository.listActive).toHaveBeenCalledWith('household-1');
    expect(customLedgerCodeRepository.list).not.toHaveBeenCalled();
    expect(result).toEqual([{ code: 'expense:travel' }]);
  });

  it('lists all custom ledger codes when includeInactive is true', async () => {
    const { customLedgerCodeRepository } = await import(
      '@/infra/repositories/customLedgerCodeRepository'
    );

    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([
      { code: 'expense:travel' },
    ] as never);

    const result = await listCustomLedgerCodesUseCase.execute({
      householdId: 'household-1',
      includeInactive: true,
      auth: { uid: 'user-1', isGlobalAdmin: true },
    });

    expect(customLedgerCodeRepository.list).toHaveBeenCalledWith(['household-1']);
    expect(customLedgerCodeRepository.listActive).not.toHaveBeenCalled();
    expect(result).toEqual([{ code: 'expense:travel' }]);
  });
});
