import { type Mocked, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BaseRepository } from '../repositories/baseRepository';
// Import after mock
import { transactionRepository } from '../repositories/transactionRepository';
import type { Transaction } from '../schemas/transaction';
import { transactionService } from './transactionService';

// Mock TransactionRepository
vi.mock('../repositories/transactionRepository', () => ({
  transactionRepository: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Type the mocked repository
const mockedTransactionRepository = transactionRepository as unknown as Mocked<
  Pick<
    BaseRepository<Transaction, [string, string?]>,
    'create' | 'list' | 'get' | 'update' | 'delete'
  >
>;

describe('transactionService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should call repository.create', async () => {
      const transactionData = {
        amount: 100,
        type: 'expense' as const,
        category: 'food',
        date: new Date('2023-10-01'),
        description: 'Lunch',
        projectId: 'project-1',
        createdBy: 'user-1',
      };

      mockedTransactionRepository.create.mockResolvedValue('new-id');

      const result = await transactionService.createTransaction(
        householdId,
        transactionData,
        'user@mail.com',
      );

      expect(mockedTransactionRepository.create).toHaveBeenCalledWith(
        [householdId],
        transactionData,
        'user@mail.com',
      );
      expect(result).toBe('new-id');
    });
  });

  describe('getTransactions', () => {
    it('should return filtered transactions', async () => {
      const mockTransactions = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'food',
          date: new Date('2023-10-01'),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: new Date(),
          updatedBy: 'u1',
          updatedAt: new Date(),
        },
        {
          id: '2',
          amount: 200,
          type: 'income',
          category: 'salary',
          date: new Date('2023-10-02'),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: new Date(),
          updatedBy: 'u1',
          updatedAt: new Date(),
        },
      ];

      mockedTransactionRepository.list.mockResolvedValue(mockTransactions as Transaction[]);

      // Test filtering by type
      const expenses = await transactionService.getTransactions(householdId, { type: 'expense' });
      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('1');

      // Test filtering by date
      const dateFiltered = await transactionService.getTransactions(householdId, {
        startDate: new Date('2023-10-02'),
      });
      expect(dateFiltered).toHaveLength(1);
      expect(dateFiltered[0].id).toBe('2');
    });
  });
});
