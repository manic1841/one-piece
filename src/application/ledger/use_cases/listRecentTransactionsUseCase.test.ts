import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { listRecentTransactionsUseCase } from './listRecentTransactionsUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    getRecentTransactions: vi.fn(),
    listByDateRange: vi.fn(),
  },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

describe('listRecentTransactionsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transactionRepository.getRecentTransactions).mockResolvedValue([]);
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([]);
  });

  it('passes limit to getRecentTransactions when no date range', async () => {
    await listRecentTransactionsUseCase.execute({ householdId: 'h1', limit: 50, auth });

    expect(transactionRepository.getRecentTransactions).toHaveBeenCalledWith('h1', 50);
    expect(transactionRepository.listByDateRange).not.toHaveBeenCalled();
  });

  it('pushes limit into listByDateRange query instead of slicing in memory', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-31');

    await listRecentTransactionsUseCase.execute({
      householdId: 'h1',
      limit: 50,
      startDate,
      endDate,
      auth,
    });

    expect(transactionRepository.listByDateRange).toHaveBeenCalledWith(
      'h1',
      startDate,
      endDate,
      50,
    );
    expect(transactionRepository.getRecentTransactions).not.toHaveBeenCalled();
  });

  it('does not apply slice on the returned data', async () => {
    const transactions = [{ id: 't1' }, { id: 't2' }];
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue(transactions as never);

    const result = await listRecentTransactionsUseCase.execute({
      householdId: 'h1',
      limit: 50,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      auth,
    });

    expect(result).toEqual(transactions);
  });
});
