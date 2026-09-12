import { runTransaction } from 'firebase/firestore';

import { z } from 'zod';

import {
  TransactionWithAllocationCommandError,
  TransactionWithAllocationCommandErrorCode,
} from '@/application/ledger/errors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { AllocationCreateSchema, type AllocationCreate } from '@/domains/allocation/schemas';
import {
  createTransactionWithAllocationFingerprint,
  TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
  TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
} from '@/domains/operation/fingerprint';
import { type OperationResultReference } from '@/domains/operation/schemas';
import {
  type TransactionCreate,
  TransactionCreateSchema,
} from '@/domains/ledger/schemas';
import { LedgerValidator } from '@/domains/ledger/validator';
import { db } from '@/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { operationRepository } from '@/infra/repositories/operationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CreateTransactionWithAllocationRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  idempotencyKey: string;
  data: TransactionCreate;
  allocation: {
    direction: 'INCOME' | 'EXPENSE';
    items: { projectId: string; percentage: number }[];
  };
}

export interface CreateTransactionWithAllocationResult {
  transactionId: string;
  allocationId: string;
}

const AllocationRequestSchema = z.object({
  direction: z.enum(['INCOME', 'EXPENSE']),
  items: z.array(
    z.object({
      projectId: z.string(),
      percentage: z.number(),
    }),
  ),
});

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export class CreateTransactionWithAllocationUseCase {
  async execute(
    request: CreateTransactionWithAllocationRequest,
  ): Promise<CreateTransactionWithAllocationResult> {
    const { householdId, userEmail, auth, idempotencyKey, data, allocation } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
      throw new TransactionWithAllocationCommandError(
        TransactionWithAllocationCommandErrorCode.INVALID_IDEMPOTENCY_KEY,
        'idempotency key must be a non-empty caller-generated value',
      );
    }

    const transactionData = validateTransaction(data);
    const allocationData = validateAllocationRequest(transactionData, allocation);

    const payloadFingerprint = await createTransactionWithAllocationFingerprint({
      transaction: transactionData,
      allocation: allocationData,
    });
    const transactionId = transactionRepository.generateId(householdId);

    try {
      return await runTransaction(db, async (tx) => {
        const existingOperation = await operationRepository.getByKey(
          householdId,
          TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
          idempotencyKey,
          tx,
        );

        if (existingOperation) {
          if (existingOperation.payloadFingerprint !== payloadFingerprint) {
            throw new TransactionWithAllocationCommandError(
              TransactionWithAllocationCommandErrorCode.IDEMPOTENCY_CONFLICT,
              'idempotency key is already associated with a different transaction payload',
            );
          }
          if (existingOperation.status === 'SUCCEEDED') {
            return readResultReference(existingOperation.resultReference);
          }
          throw new TransactionWithAllocationCommandError(
            TransactionWithAllocationCommandErrorCode.OPERATION_IN_PROGRESS,
            'the idempotent transaction operation is not complete',
          );
        }

        const allocationId = transactionId;
        const persistedAllocationData = buildAllocationData(
          transactionId,
          transactionData,
          allocationData,
          userEmail,
        );

        await transactionRepository.create(
          [householdId],
          { ...transactionData, allocationId },
          userEmail,
          tx,
          transactionId,
        );
        await allocationRepository.create(
          [householdId],
          persistedAllocationData,
          userEmail,
          tx,
          allocationId,
        );

        const result: CreateTransactionWithAllocationResult = {
          transactionId,
          allocationId,
        };
        const resultReference: OperationResultReference = {
          transactionId: result.transactionId,
          allocationId: result.allocationId,
        };

        await operationRepository.createSucceeded(
          householdId,
          TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
          idempotencyKey,
          TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
          payloadFingerprint,
          resultReference,
          auth.uid,
          tx,
        );

        return result;
      });
    } catch (error: unknown) {
      if (error instanceof TransactionWithAllocationCommandError) throw error;

      const message = error instanceof Error ? error.message : 'unknown transaction failure';
      throw new TransactionWithAllocationCommandError(
        TransactionWithAllocationCommandErrorCode.TRANSACTION_FAILED,
        message,
      );
    }
  }
}

export const createTransactionWithAllocationUseCase = new CreateTransactionWithAllocationUseCase();

const validateTransaction = (data: unknown): TransactionCreate => {
  const parsed = TransactionCreateSchema.safeParse(data);
  if (!parsed.success || typeof parsed.data.amount !== 'number' || parsed.data.amount <= 0) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      'transaction payload is invalid',
    );
  }

  if (parsed.data.intentType !== 'INCOME' && parsed.data.intentType !== 'EXPENSE') {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.UNSUPPORTED_INTENT_TYPE,
      'allocation is only supported for INCOME or EXPENSE transactions',
    );
  }

  const validationErrors = LedgerValidator.validateTransaction(parsed.data);
  if (validationErrors.length > 0) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      validationErrors.join(', '),
    );
  }

  return parsed.data;
};

const validateAllocationRequest = (
  transaction: TransactionCreate,
  allocation: unknown,
): CreateTransactionWithAllocationRequest['allocation'] => {
  const parsed = AllocationRequestSchema.safeParse(allocation);
  if (!parsed.success) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      'allocation payload is invalid',
    );
  }

  if (parsed.data.direction !== transaction.intentType) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      'allocation direction must match transaction intent type',
    );
  }

  if (
    parsed.data.items.length === 0 ||
    parsed.data.items.some(
      (item) =>
        item.projectId.trim().length === 0 ||
        !Number.isFinite(item.percentage) ||
        item.percentage <= 0,
    )
  ) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      'allocation items are invalid',
    );
  }

  const totalPercentage = parsed.data.items.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      `Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`,
    );
  }

  return parsed.data;
};

const buildAllocationData = (
  transactionId: string,
  transaction: TransactionCreate,
  allocation: CreateTransactionWithAllocationRequest['allocation'],
  userEmail: string,
): AllocationCreate => {
  const allocationData: AllocationCreate = {
    date: transaction.date,
    yearMonth: toYearMonth(transaction.date),
    sourceTransactionId: transactionId,
    direction: allocation.direction,
    totalAmount: transaction.amount ?? 0,
    items: allocation.items.map((item) => ({
      projectId: item.projectId,
      percentage: item.percentage,
      amount: Math.round(((transaction.amount ?? 0) * item.percentage) / 100),
    })),
    projectIds: allocation.items.map((item) => item.projectId),
    createdBy: userEmail,
  };

  const parsed = AllocationCreateSchema.safeParse(allocationData);
  const validationErrors = LedgerValidator.validateAllocation(allocationData);
  if (!parsed.success || validationErrors.length > 0) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.INVALID_PAYLOAD,
      validationErrors.join(', ') || 'allocation payload is invalid',
    );
  }

  return parsed.data;
};

const readResultReference = (
  reference: OperationResultReference | null,
): CreateTransactionWithAllocationResult => {
  if (
    !reference ||
    typeof reference.transactionId !== 'string' ||
    typeof reference.allocationId !== 'string'
  ) {
    throw new TransactionWithAllocationCommandError(
      TransactionWithAllocationCommandErrorCode.TRANSACTION_FAILED,
      'invalid transaction-with-allocation operation result reference',
    );
  }

  return {
    transactionId: reference.transactionId,
    allocationId: reference.allocationId,
  };
};