import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type TransactionCreate } from '@/infra/schemas/ledger';

interface AddExpenseInput {
  amount: number;
  projectId: string;
  ledgerCode: string; // expense:* category
  description?: string;
  date: Date;
}

export const expenseService = {
  async addExpense(householdId: string, userEmail: string, input: AddExpenseInput): Promise<void> {
    if (!input.ledgerCode.startsWith('expense:')) {
      throw new Error('LedgerCode must be an expense category');
    }

    const transactionData: TransactionCreate = {
      date: input.date,
      description: input.description || '',
      intentType: 'EXPENSE',
      projectId: input.projectId,
      allocationId: null,
      createdBy: userEmail,
      entries: [
        {
          ledgerCode: input.ledgerCode, // Dr. expense:*
          debit: input.amount,
          credit: 0,
        },
        {
          ledgerCode: 'asset:cash', // Cr. asset:cash
          debit: 0,
          credit: input.amount,
        },
      ],
    };

    await transactionRepository.create([householdId], transactionData, userEmail);
  },
};
