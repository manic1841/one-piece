import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type AllocationCreate } from '@/infra/schemas/allocation';
import { type TransactionCreate } from '@/infra/schemas/ledger';

interface AddIncomeInput {
  amount: number;
  projectId: string;
  ledgerCode: string; // income:* category
  description?: string;
  date: Date;
}

export const incomeService = {
  async addIncome(
    householdId: string,
    userEmail: string,
    input: AddIncomeInput,
  ): Promise<{ transactionId: string }> {
    if (!input.ledgerCode.startsWith('income:')) {
      throw new Error('LedgerCode must be an income category');
    }

    const transactionData: TransactionCreate = {
      date: input.date,
      description: input.description || '',
      intentType: 'INCOME',
      projectId: input.projectId,
      allocationId: null,
      createdBy: userEmail,
      entries: [
        {
          ledgerCode: input.ledgerCode, // Cr. income:*
          debit: 0,
          credit: input.amount,
        },
        {
          ledgerCode: 'asset:cash', // Dr. asset:cash
          debit: input.amount,
          credit: 0,
        },
      ],
    };

    const transactionId = await transactionRepository.create(
      [householdId],
      transactionData,
      userEmail,
    );
    return { transactionId };
  },

  async createAllocation(
    householdId: string,
    userEmail: string,
    input: {
      transactionId: string;
      totalAmount: number;
      items: { projectId: string; percentage: number }[];
    },
  ): Promise<void> {
    const allocationData: AllocationCreate = {
      date: new Date(),
      sourceTransactionId: input.transactionId,
      totalAmount: input.totalAmount,
      items: input.items.map((item) => ({
        projectId: item.projectId,
        percentage: item.percentage,
        amount: Math.round((input.totalAmount * item.percentage) / 100),
      })),
      projectIds: input.items.map((item) => item.projectId),
      createdBy: userEmail,
    };

    const allocationId = await allocationRepository.create(
      [householdId],
      allocationData,
      userEmail,
    );

    // Update the transaction with the new allocationId
    await transactionRepository.updateAllocationId(
      householdId,
      input.transactionId,
      allocationId,
      userEmail,
    );
  },
};
