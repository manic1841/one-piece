import { collection, getDocsFromServer } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTransactionWithAllocationUseCase } from './createTransactionWithAllocationUseCase';
import { db, resetMockDb } from '@/test/mocks/firebase';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { operationRepository } from '@/infra/repositories/operationRepository';

const request = (overrides: { householdId?: string; idempotencyKey?: string } = {}) => ({
  householdId: overrides.householdId ?? 'household-1',
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: true },
  idempotencyKey: overrides.idempotencyKey ?? 'allocation-operation-1',
  data: {
    date: new Date('2026-09-02T00:00:00'),
    description: 'Salary',
    intent: 'SALARY',
    intentType: 'INCOME' as const,
    amount: 10000,
    projectId: null,
    allocationId: null,
    createdBy: 'user@example.com',
    entries: [
      { ledgerCode: 'asset:cash', debit: 10000, credit: 0 },
      { ledgerCode: 'income:salary:charles', debit: 0, credit: 10000 },
    ],
  },
  allocation: {
    direction: 'INCOME' as const,
    items: [{ projectId: 'project-1', percentage: 100 }],
  },
  ...overrides,
});

const collectionRef = (householdId: string, name: string) =>
  collection(db, 'households', householdId, name);

describe('CreateTransactionWithAllocationUseCase with Firestore Emulator', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('commits one transaction, deterministic allocation, source link, and operation result', async () => {
    const result = await createTransactionWithAllocationUseCase.execute(request());
    const [transactions, allocations, operation] = await Promise.all([
      getDocsFromServer(collectionRef('household-1', 'transactions')),
      getDocsFromServer(collectionRef('household-1', 'allocations')),
      operationRepository.getByKey(
        'household-1',
        'TRANSACTION_WITH_ALLOCATION',
        'allocation-operation-1',
      ),
    ]);

    expect(result.transactionId).toBe(result.allocationId);
    expect(transactions.docs).toHaveLength(1);
    expect(allocations.docs).toHaveLength(1);
    expect(transactions.docs[0]?.id).toBe(result.transactionId);
    expect(allocations.docs[0]?.id).toBe(result.allocationId);
    expect(transactions.docs[0]?.data()).toMatchObject({
      intentType: 'INCOME',
      allocationId: result.allocationId,
      amount: 10000,
      ledgerCodes: ['asset:cash', 'income:salary:charles'],
    });
    expect(allocations.docs[0]?.data()).toMatchObject({
      sourceTransactionId: result.transactionId,
      direction: 'INCOME',
      totalAmount: 10000,
      projectIds: ['project-1'],
      items: [{ projectId: 'project-1', percentage: 100, amount: 10000 }],
    });
    expect(operation).toMatchObject({
      operationType: 'TRANSACTION_WITH_ALLOCATION',
      idempotencyKey: 'allocation-operation-1',
      fingerprintVersion: 1,
      status: 'SUCCEEDED',
      createdByUid: 'user-1',
      resultReference: result,
    });
  });

  it('creates an expense with an expense allocation', async () => {
    const baseRequest = request({
      householdId: 'household-expense',
      idempotencyKey: 'expense-operation-1',
    });
    const expenseRequest = {
      ...baseRequest,
      data: {
        ...baseRequest.data,
        intent: 'FOOD',
        intentType: 'EXPENSE' as const,
        amount: 1000,
        entries: [
          { ledgerCode: 'expense:food', debit: 1000, credit: 0 },
          { ledgerCode: 'asset:cash', debit: 0, credit: 1000 },
        ],
      },
      allocation: {
        direction: 'EXPENSE' as const,
        items: [
          { projectId: 'project-1', percentage: 25 },
          { projectId: 'project-2', percentage: 75 },
        ],
      },
    };

    const result = await createTransactionWithAllocationUseCase.execute(expenseRequest);
    const [transactionSnapshot, allocationSnapshot] = await Promise.all([
      getDocsFromServer(collectionRef('household-expense', 'transactions')),
      getDocsFromServer(collectionRef('household-expense', 'allocations')),
    ]);

    expect(transactionSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(transactionSnapshot.docs[0]?.data()).toMatchObject({
      intentType: 'EXPENSE',
      allocationId: result.allocationId,
      amount: 1000,
    });
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      sourceTransactionId: result.transactionId,
      direction: 'EXPENSE',
      items: [
        { projectId: 'project-1', percentage: 25, amount: 250 },
        { projectId: 'project-2', percentage: 75, amount: 750 },
      ],
    });
  });

  it('replays the original result without creating duplicate documents', async () => {
    const replayRequest = request({ householdId: 'household-replay' });
    const firstResult = await createTransactionWithAllocationUseCase.execute(replayRequest);
    const replayResult = await createTransactionWithAllocationUseCase.execute(replayRequest);
    const [transactions, allocations] = await Promise.all([
      getDocsFromServer(collectionRef('household-replay', 'transactions')),
      getDocsFromServer(collectionRef('household-replay', 'allocations')),
    ]);

    expect(replayResult).toEqual(firstResult);
    expect(transactions.docs).toHaveLength(1);
    expect(allocations.docs).toHaveLength(1);
  });

  it('keeps identical requests with different keys independent', async () => {
    const firstRequest = request({
      householdId: 'household-independent',
      idempotencyKey: 'allocation-operation-1',
    });
    const secondRequest = request({
      householdId: 'household-independent',
      idempotencyKey: 'allocation-operation-2',
    });

    const [firstResult, secondResult] = await Promise.all([
      createTransactionWithAllocationUseCase.execute(firstRequest),
      createTransactionWithAllocationUseCase.execute(secondRequest),
    ]);
    const [transactions, allocations, firstOperation, secondOperation] = await Promise.all([
      getDocsFromServer(collectionRef('household-independent', 'transactions')),
      getDocsFromServer(collectionRef('household-independent', 'allocations')),
      operationRepository.getByKey(
        'household-independent',
        'TRANSACTION_WITH_ALLOCATION',
        'allocation-operation-1',
      ),
      operationRepository.getByKey(
        'household-independent',
        'TRANSACTION_WITH_ALLOCATION',
        'allocation-operation-2',
      ),
    ]);

    expect(firstResult).not.toEqual(secondResult);
    expect(transactions.docs).toHaveLength(2);
    expect(allocations.docs).toHaveLength(2);
    expect(firstOperation?.resultReference).toEqual(firstResult);
    expect(secondOperation?.resultReference).toEqual(secondResult);
    expect(firstOperation).not.toHaveProperty('userEmail');
    expect(secondOperation).not.toHaveProperty('userEmail');
  });

  it('handles concurrent requests with the same key as one operation', async () => {
    const concurrentRequest = request({ householdId: 'household-concurrent' });
    const results = await Promise.all([
      createTransactionWithAllocationUseCase.execute(concurrentRequest),
      createTransactionWithAllocationUseCase.execute(concurrentRequest),
    ]);
    const [transactions, allocations] = await Promise.all([
      getDocsFromServer(collectionRef('household-concurrent', 'transactions')),
      getDocsFromServer(collectionRef('household-concurrent', 'allocations')),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(transactions.docs).toHaveLength(1);
    expect(allocations.docs).toHaveLength(1);
  });

  it('rolls back the transaction and operation when allocation persistence fails', async () => {
    const rollbackRequest = request({ householdId: 'household-rollback' });
    const failure = vi
      .spyOn(allocationRepository, 'create')
      .mockRejectedValueOnce(new Error('allocation write failed'));

    await expect(
      createTransactionWithAllocationUseCase.execute(rollbackRequest),
    ).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });

    failure.mockRestore();
    const [transactions, allocations, operation] = await Promise.all([
      getDocsFromServer(collectionRef('household-rollback', 'transactions')),
      getDocsFromServer(collectionRef('household-rollback', 'allocations')),
      operationRepository.getByKey(
        'household-rollback',
        'TRANSACTION_WITH_ALLOCATION',
        'allocation-operation-1',
      ),
    ]);

    expect(transactions.docs).toHaveLength(0);
    expect(allocations.docs).toHaveLength(0);
    expect(operation).toBeNull();
  });
});