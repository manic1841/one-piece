import { type Transaction as FirestoreTransaction, runTransaction } from 'firebase/firestore';
import { z } from 'zod';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  AllocationReplacementCommandError,
  AllocationReplacementCommandErrorCode,
} from '@/application/ledger/allocationReplacementErrors';
import { type AuthContext } from '@/application/types';
import {
  type Allocation,
  type AllocationCreate,
  AllocationCreateSchema,
} from '@/domains/allocation/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import { LedgerValidator } from '@/domains/ledger/validator';
import { db } from '@/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export const AllocationReplacementInputSchema = z.object({
  transactionDate: z.date(),
  totalAmount: z.number(),
  items: z.array(
    z.object({
      projectId: z.string(),
      percentage: z.number(),
    }),
  ),
  direction: z.enum(['INCOME', 'EXPENSE']),
});

export type AllocationReplacementInput = z.infer<typeof AllocationReplacementInputSchema>;

export interface ReplaceAllocationRequest {
  householdId: string;
  transactionId: string;
  userEmail: string;
  auth: AuthContext;
  allocation: AllocationReplacementInput;
}

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const validateAllocationReplacementInput = (input: unknown): AllocationReplacementInput => {
  const parsed = AllocationReplacementInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      'allocation payload is invalid',
    );
  }

  if (
    !Number.isFinite(parsed.data.totalAmount) ||
    parsed.data.totalAmount <= 0 ||
    parsed.data.items.length === 0 ||
    parsed.data.items.some(
      (item) =>
        item.projectId.trim().length === 0 ||
        !Number.isFinite(item.percentage) ||
        item.percentage <= 0,
    )
  ) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      'allocation items are invalid',
    );
  }

  const totalPercentage = parsed.data.items.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      `Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`,
    );
  }

  return parsed.data;
};

export const buildAllocationData = (
  transactionId: string,
  allocation: AllocationReplacementInput,
  userEmail: string,
): AllocationCreate => {
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

  const parsed = AllocationCreateSchema.safeParse(allocationData);
  const validationErrors = LedgerValidator.validateAllocation(allocationData);
  if (!parsed.success || validationErrors.length > 0) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      validationErrors.join(', ') || 'allocation payload is invalid',
    );
  }

  return parsed.data;
};

interface ReplaceCurrentAllocationInTransactionRequest {
  householdId: string;
  transactionId: string;
  userEmail: string;
  allocation: AllocationReplacementInput;
  tx: FirestoreTransaction;
  existingAllocations?: Allocation[];
}

export const replaceCurrentAllocationInTransaction = async ({
  householdId,
  transactionId,
  userEmail,
  allocation,
  tx,
  existingAllocations,
}: ReplaceCurrentAllocationInTransactionRequest): Promise<void> => {
  const allocations =
    existingAllocations ??
    (await allocationRepository.listBySourceTransactionId(householdId, transactionId));
  const allocationData = buildAllocationData(transactionId, allocation, userEmail);
  const deterministicAllocation = allocations.find(
    (currentAllocation) => currentAllocation.id === transactionId,
  );

  if (deterministicAllocation) {
    await allocationRepository.update(
      [householdId, transactionId],
      {
        ...allocationData,
        createdAt: deterministicAllocation.createdAt,
        createdBy: deterministicAllocation.createdBy,
      },
      userEmail,
      tx,
    );
  } else {
    await allocationRepository.create([householdId], allocationData, userEmail, tx, transactionId);
  }

  for (const currentAllocation of allocations) {
    if (currentAllocation.id !== transactionId) {
      await allocationRepository.delete([householdId, currentAllocation.id], tx);
    }
  }

  await transactionRepository.updateAllocationId(
    householdId,
    transactionId,
    transactionId,
    userEmail,
    tx,
  );
};

const assertSourceMatchesAllocation = (
  transaction: Transaction,
  allocation: AllocationReplacementInput,
): void => {
  if (transaction.intentType !== 'INCOME' && transaction.intentType !== 'EXPENSE') {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.UNSUPPORTED_INTENT_TYPE,
      'allocation is only supported for INCOME or EXPENSE transactions',
    );
  }

  if (allocation.direction !== transaction.intentType) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      'allocation direction must match transaction intent type',
    );
  }

  if (
    transaction.amount !== allocation.totalAmount ||
    transaction.date.getTime() !== allocation.transactionDate.getTime()
  ) {
    throw new AllocationReplacementCommandError(
      AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
      'allocation amount and date must match the source transaction',
    );
  }
};

export class ReplaceAllocationUseCase {
  async execute(request: ReplaceAllocationRequest): Promise<void> {
    const { householdId, transactionId, userEmail, auth } = request;

    try {
      await householdPermissionService.assertWritePermission(
        householdId,
        auth.uid,
        auth.isGlobalAdmin,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'permission denied';
      throw new AllocationReplacementCommandError(
        AllocationReplacementCommandErrorCode.PERMISSION_DENIED,
        message,
      );
    }

    const allocation = validateAllocationReplacementInput(request.allocation);

    try {
      const candidateAllocations = await allocationRepository.listBySourceTransactionId(
        householdId,
        transactionId,
      );

      await runTransaction(db, async (tx) => {
        const sourceTransaction = await transactionRepository.get([householdId, transactionId], tx);
        if (!sourceTransaction) {
          throw new AllocationReplacementCommandError(
            AllocationReplacementCommandErrorCode.TRANSACTION_NOT_FOUND,
            'Transaction not found.',
          );
        }

        assertSourceMatchesAllocation(sourceTransaction, allocation);

        const existingAllocations = (
          await allocationRepository.getByIds(
            householdId,
            [
              transactionId,
              ...candidateAllocations.map((candidate) => candidate.id),
              sourceTransaction.allocationId ?? '',
            ],
            tx,
          )
        ).filter(
          (currentAllocation) =>
            currentAllocation.sourceTransactionId === transactionId ||
            currentAllocation.id === sourceTransaction.allocationId,
        );

        await replaceCurrentAllocationInTransaction({
          householdId,
          transactionId,
          userEmail,
          allocation,
          tx,
          existingAllocations,
        });
      });
    } catch (error: unknown) {
      if (error instanceof AllocationReplacementCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new AllocationReplacementCommandError(
        AllocationReplacementCommandErrorCode.TRANSACTION_FAILED,
        message,
      );
    }
  }
}

export const replaceAllocationUseCase = new ReplaceAllocationUseCase();
