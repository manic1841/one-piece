import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { type Transaction } from '@/domains/ledger/schemas';

export interface ListProjectRecordsRequest {
  householdId: string;
  projectId: string;
  yearMonth?: string;
}

const toMillis = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return ((value as { seconds: number }).seconds || 0) * 1000;
  }

  return 0;
};

export class ListProjectRecordsUseCase {
  async execute(request: ListProjectRecordsRequest): Promise<Transaction[]> {
    const { householdId, projectId, yearMonth } = request;

    const directRecords = yearMonth
      ? await transactionRepository.getTransactionsByProject(householdId, projectId, yearMonth)
      : await transactionRepository.listByProject(householdId, projectId);

    const allocations = await allocationRepository.listByProject(householdId, projectId, yearMonth);

    const allocatedAmountByTransaction = new Map<
      string,
      { amount: number; direction: 'INCOME' | 'EXPENSE' | undefined }
    >();

    for (const allocation of allocations) {
      const allocatedAmount = allocation.items
        .filter((item) => item.projectId === projectId)
        .reduce((sum, item) => sum + item.amount, 0);

      if (!allocatedAmount) {
        continue;
      }

      const existing = allocatedAmountByTransaction.get(allocation.sourceTransactionId);
      if (!existing) {
        allocatedAmountByTransaction.set(allocation.sourceTransactionId, {
          amount: allocatedAmount,
          direction: allocation.direction,
        });
        continue;
      }

      allocatedAmountByTransaction.set(allocation.sourceTransactionId, {
        amount: existing.amount + allocatedAmount,
        direction: existing.direction ?? allocation.direction,
      });
    }

    const directRecordIds = new Set(directRecords.map((record) => record.id));
    const sourceTransactionIds = Array.from(allocatedAmountByTransaction.keys()).filter(
      (transactionId) => !directRecordIds.has(transactionId),
    );

    const sourceTransactions = await Promise.all(
      sourceTransactionIds.map((transactionId) =>
        transactionRepository.getById(householdId, transactionId),
      ),
    );

    const allocationRecords: Transaction[] = sourceTransactions
      .map((sourceTransaction) => {
        if (!sourceTransaction) {
          return null;
        }

        const allocated = allocatedAmountByTransaction.get(sourceTransaction.id);
        if (!allocated) {
          return null;
        }

        const signedAmount =
          allocated.direction === 'EXPENSE' ? -Math.abs(allocated.amount) : Math.abs(allocated.amount);

        return {
          ...sourceTransaction,
          id: `${sourceTransaction.id}:allocation:${projectId}`,
          projectId,
          amount: signedAmount,
          description: sourceTransaction.description
            ? `${sourceTransaction.description} (allocation)`
            : 'Allocation record',
        } as Transaction;
      })
      .filter((record): record is Transaction => record !== null);

    return [...directRecords, ...allocationRecords].sort((a, b) => toMillis(b.date) - toMillis(a.date));
  }
}

export const listProjectRecordsUseCase = new ListProjectRecordsUseCase();
