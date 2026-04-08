import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    getDebtAccounts: vi.fn(),
  },
}));

describe('listDebtAccountsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists active debt accounts by default', async () => {
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);

    await listDebtAccountsUseCase.execute({ householdId: 'household-1' });

    expect(debtAccountRepository.getDebtAccounts).toHaveBeenCalledWith('household-1', false);
  });

  it('can include inactive debt accounts when requested', async () => {
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);

    await listDebtAccountsUseCase.execute({
      householdId: 'household-1',
      includeInactive: true,
    });

    expect(debtAccountRepository.getDebtAccounts).toHaveBeenCalledWith('household-1', true);
  });
});
