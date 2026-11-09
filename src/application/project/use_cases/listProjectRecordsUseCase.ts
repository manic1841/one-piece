import { IntentType } from '@/domains/ledger/constants/intentType';
import { type Transaction } from '@/domains/ledger/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { windowToDateRange } from '../monthWindow';

export interface ListProjectRecordsRequest {
  householdId: string;
  projectId: string;
  yearMonth?: string;
  /** Inclusive `YYYY-MM` lower bound of the queried window. */
  fromYearMonth?: string;
  /** Inclusive `YYYY-MM` upper bound of the queried window. */
  toYearMonth?: string;
  /** Cap on the records returned for the window. */
  limit?: number;
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
    const {
      householdId,
      projectId,
      yearMonth,
      fromYearMonth,
      toYearMonth,
      limit: maxLimit,
    } = request;

    const range = windowToDateRange({
      from: fromYearMonth ?? '0000-01',
      to: toYearMonth ?? '9999-12',
    });

    const directRecords = yearMonth
      ? await transactionRepository.getTransactionsByProject(householdId, projectId, yearMonth)
      : await transactionRepository.listByProject({
          householdId,
          projectId,
          sinceDate: fromYearMonth ? range.start : undefined,
          untilDate: toYearMonth ? range.endExclusive : undefined,
          maxLimit,
        });

    const allocations = await allocationRepository.listByProject({
      householdId,
      projectId,
      yearMonth,
      sinceYearMonth: fromYearMonth,
      untilYearMonth: toYearMonth,
      maxLimit,
    });

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

    const sourceTransactions = await transactionRepository.getByIds(
      householdId,
      sourceTransactionIds,
    );
    const sourceTransactionMap = new Map(sourceTransactions.map((tx) => [tx.id, tx]));

    const allocationRecords: Transaction[] = sourceTransactionIds
      .map((transactionId) => {
        const sourceTransaction = sourceTransactionMap.get(transactionId);
        if (!sourceTransaction) {
          return null;
        }

        const allocated = allocatedAmountByTransaction.get(sourceTransaction.id);
        if (!allocated) {
          return null;
        }

        const signedAmount =
          allocated.direction === 'EXPENSE'
            ? -Math.abs(allocated.amount)
            : Math.abs(allocated.amount);

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

    // Include transfer records where this project is either source or destination
    const transferCandidates = await transactionRepository.listTransfersByProject({
      householdId,
      projectId,
      yearMonth,
      sinceDate: fromYearMonth ? range.start : undefined,
      untilDate: toYearMonth ? range.endExclusive : undefined,
      maxLimit,
    });

    const transferRecords: Transaction[] = transferCandidates
      .map((t) => {
        const amountVal = Math.abs(t.amount ?? 0);
        // If this project is the destination -> income, else expense
        const signedAmount = t.toProjectId === projectId ? amountVal : -amountVal;

        return {
          ...t,
          id: `${t.id}:transfer:${projectId}`,
          projectId,
          amount: signedAmount,
          // Adjust intentType for VM mapping so direction is computed correctly
          intentType: t.toProjectId === projectId ? IntentType.INCOME : IntentType.EXPENSE,
          description: t.description ? `${t.description} (transfer)` : 'Transfer',
        } as Transaction;
      })
      .filter((r): r is Transaction => r !== null);

    return [...directRecords, ...allocationRecords, ...transferRecords]
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
      .slice(0, maxLimit);
  }
}

export const listProjectRecordsUseCase = new ListProjectRecordsUseCase();
