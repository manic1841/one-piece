import { runTransaction } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  AllocationReplacementCommandError,
  AllocationReplacementCommandErrorCode,
} from '@/application/ledger/allocationReplacementErrors';
import { type AuthContext } from '@/application/types';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { db } from '@/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import {
  type AllocationReplacementInput,
  replaceCurrentAllocationInTransaction,
  validateAllocationReplacementInput,
} from './replaceAllocationUseCase';

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

export class UpdateTransactionUseCase {
  async execute(request: UpdateTransactionRequest): Promise<void> {
    const { householdId, transactionId, userEmail, auth, data, allocation } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const candidateAllocations = await allocationRepository.listBySourceTransactionId(
      householdId,
      transactionId,
    );

    await runTransaction(db, async (tx) => {
      const existing = await transactionRepository.get([householdId, transactionId], tx);
      if (!existing) {
        throw new Error('Transaction not found.');
      }

      const existingAllocations = (
        await allocationRepository.getByIds(
          householdId,
          [
            transactionId,
            ...candidateAllocations.map((candidate) => candidate.id),
            existing.allocationId ?? '',
          ],
          tx,
        )
      ).filter(
        (currentAllocation) =>
          currentAllocation.sourceTransactionId === transactionId ||
          currentAllocation.id === existing.allocationId,
      );
      const validatedAllocation: AllocationReplacementInput | null = allocation
        ? validateAllocationReplacementInput(allocation)
        : null;
      const targetIntentType = data.intentType ?? existing.intentType;

      if (validatedAllocation && targetIntentType !== 'INCOME' && targetIntentType !== 'EXPENSE') {
        throw new AllocationReplacementCommandError(
          AllocationReplacementCommandErrorCode.UNSUPPORTED_INTENT_TYPE,
          'allocation is only supported for INCOME or EXPENSE transactions',
        );
      }

      if (validatedAllocation && validatedAllocation.direction !== targetIntentType) {
        throw new AllocationReplacementCommandError(
          AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
          'allocation direction must match transaction intent type',
        );
      }

      if (
        validatedAllocation &&
        (validatedAllocation.totalAmount !== (data.amount ?? existing.amount) ||
          validatedAllocation.transactionDate.getTime() !== data.date.getTime())
      ) {
        throw new AllocationReplacementCommandError(
          AllocationReplacementCommandErrorCode.INVALID_PAYLOAD,
          'allocation amount and date must match the source transaction',
        );
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

      if (!validatedAllocation) {
        const allocationIds = new Set(existingAllocations.map((current) => current.id));
        if (existing.allocationId) allocationIds.add(existing.allocationId);
        for (const allocationId of allocationIds) {
          await allocationRepository.delete([householdId, allocationId], tx);
        }
        return;
      }

      await replaceCurrentAllocationInTransaction({
        householdId,
        transactionId,
        userEmail,
        allocation: validatedAllocation,
        tx,
        existingAllocations,
      });
    });
  }
}

export const updateTransactionUseCase = new UpdateTransactionUseCase();
