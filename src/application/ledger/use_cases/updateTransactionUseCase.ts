import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type AllocationCreate } from '@/domains/allocation/schemas';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { LedgerValidator } from '@/domains/ledger/validator';
import { db } from '@/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface UpdateTransactionRequest {
  householdId: string;
  transactionId: string;
  userEmail: string;
  auth: AuthContext;
  data: {
    date: Date;
    description?: string;
    intent?: string;
    intentType?: TransactionCreate['intentType'];
    amount?: number;
    projectId?: string | null;
    fromProjectId?: string | null;
    toProjectId?: string | null;
    debtAccountId?: string | null;
    entries: TransactionCreate['entries'];
  };
  allocation?: {
    transactionDate: Date;
    totalAmount: number;
    items: { projectId: string; percentage: number }[];
    direction: 'INCOME' | 'EXPENSE';
  } | null;
}

const toYearMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

export class UpdateTransactionUseCase {
  async execute(request: UpdateTransactionRequest): Promise<void> {
    const { householdId, transactionId, userEmail, auth, data, allocation } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await runTransaction(db, async (tx) => {
      const existing = await transactionRepository.get([householdId, transactionId], tx);
      if (!existing) {
        throw new Error('Transaction not found.');
      }

      if (existing.allocationId) {
        await allocationRepository.delete([householdId, existing.allocationId], tx);
      }

      await transactionRepository.updateTransactionData(
        householdId,
        transactionId,
        {
          date: data.date,
          description: data.description,
          intent: data.intent,
          intentType: data.intentType,
          amount: data.amount,
          projectId: data.projectId ?? null,
          fromProjectId: data.fromProjectId ?? null,
          toProjectId: data.toProjectId ?? null,
          debtAccountId: data.debtAccountId ?? null,
          entries: data.entries,
          allocationId: null,
        },
        userEmail,
        tx,
      );

      if (!allocation) {
        return;
      }

      const totalPercentage = allocation.items.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(
          `Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`,
        );
      }

      const allocationData: AllocationCreate = {
        date: allocation.transactionDate,
        yearMonth: toYearMonth(allocation.transactionDate),
        sourceTransactionId: transactionId,
        direction: allocation.direction,
        totalAmount: allocation.totalAmount,
        items: allocation.items.map((item) => ({
          projectId: item.projectId,
          percentage: item.percentage,
          amount: Math.round((allocation.totalAmount * item.percentage) / 100),
        })),
        projectIds: allocation.items.map((item) => item.projectId),
        createdBy: userEmail,
      };

      const validationErrors = LedgerValidator.validateAllocation(allocationData);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid allocation: ${validationErrors.join(', ')}`);
      }

      const allocationId = await allocationRepository.create(
        [householdId],
        allocationData,
        userEmail,
        tx,
      );

      await transactionRepository.updateAllocationId(
        householdId,
        transactionId,
        allocationId,
        userEmail,
        tx,
      );
    });
  }
}

export const updateTransactionUseCase = new UpdateTransactionUseCase();
