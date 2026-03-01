import type { Transaction } from '@/schemas/transaction';

// Factory: Transaction
export function createTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'tx-test-1',
    projectId: 'project-test-1',
    date: new Date(),
    type: 'expense',
    category: 'Food',
    amount: 500,
    description: 'Test Transaction',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    ...overrides,
  };
}

// Batch Factory: Create multiple Transactions
export function createTransactions(count: number, overrides?: Partial<Transaction>): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    createTransaction({
      id: `tx-test-${i + 1}`,
      ...overrides,
    }),
  );
}
