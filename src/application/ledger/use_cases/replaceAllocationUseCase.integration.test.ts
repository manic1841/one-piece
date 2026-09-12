import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { replaceAllocationUseCase } from './replaceAllocationUseCase';
import { type AllocationCreate } from '@/domains/allocation/schemas';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const date = new Date('2026-09-02T00:00:00');

const collectionRef = (householdId: string, name: string) =>
  collection(db, 'households', householdId, name);

const transactionRef = (householdId: string, transactionId: string) =>
  doc(db, 'households', householdId, 'transactions', transactionId);

const createSourceTransaction = async (
  householdId: string,
  intentType: 'INCOME' | 'EXPENSE' = 'INCOME',
  amount = 10000,
): Promise<string> => {
  const data: TransactionCreate = {
    date,
    description: intentType === 'INCOME' ? 'Salary source' : 'Food source',
    intent: intentType === 'INCOME' ? 'SALARY' : 'FOOD',
    intentType,
    amount,
    projectId: null,
    allocationId: null,
    createdBy: 'user@example.com',
    entries:
      intentType === 'INCOME'
        ? [
            { ledgerCode: 'asset:cash', debit: amount, credit: 0 },
            { ledgerCode: 'income:salary', debit: 0, credit: amount },
          ]
        : [
            { ledgerCode: 'expense:food', debit: amount, credit: 0 },
            { ledgerCode: 'asset:cash', debit: 0, credit: amount },
          ],
  };

  return transactionRepository.create([householdId], data, 'user@example.com');
};

const replacementRequest = (
  householdId: string,
  transactionId: string,
  direction: 'INCOME' | 'EXPENSE',
  items: { projectId: string; percentage: number }[],
  totalAmount = 10000,
) => ({
  householdId,
  transactionId,
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: true },
  allocation: {
    transactionDate: date,
    totalAmount,
    direction,
    items,
  },
});

const createLegacyAllocation = async (
  householdId: string,
  transactionId: string,
  allocationId: string,
): Promise<string> => {
  const data: AllocationCreate = {
    date,
    yearMonth: '2026-09',
    sourceTransactionId: transactionId,
    direction: 'INCOME',
    totalAmount: 10000,
    items: [{ projectId: 'project-old', percentage: 100, amount: 10000 }],
    projectIds: ['project-old'],
    createdBy: 'user@example.com',
  };

  return allocationRepository.create(
    [householdId],
    data,
    'user@example.com',
    undefined,
    allocationId,
  );
};

describe('ReplaceAllocationUseCase with Firestore Emulator', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('allocates a source Transaction that did not previously have an Allocation', async () => {
    const householdId = 'household-no-allocation';
    const transactionId = await createSourceTransaction(householdId);

    await replaceAllocationUseCase.execute(
      replacementRequest(householdId, transactionId, 'INCOME', [
        { projectId: 'project-1', percentage: 100 },
      ]),
    );

    const [transactionSnapshot, allocationSnapshot] = await Promise.all([
      getDocFromServer(transactionRef(householdId, transactionId)),
      getDocsFromServer(collectionRef(householdId, 'allocations')),
    ]);

    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs[0]?.id).toBe(transactionId);
    expect(transactionSnapshot.data()).toMatchObject({ allocationId: transactionId });
  });

  it('replaces the deterministic Allocation and keeps one document on repeated desired state', async () => {
    const householdId = 'household-repeat';
    const transactionId = await createSourceTransaction(householdId);
    const request = replacementRequest(householdId, transactionId, 'INCOME', [
      { projectId: 'project-1', percentage: 100 },
    ]);

    await replaceAllocationUseCase.execute(request);
    await replaceAllocationUseCase.execute(request);

    const allocationSnapshot = await getDocsFromServer(collectionRef(householdId, 'allocations'));
    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs[0]?.id).toBe(transactionId);
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      sourceTransactionId: transactionId,
      items: [{ projectId: 'project-1', percentage: 100, amount: 10000 }],
    });
  });

  it('replaces a different desired state without changing financial source fields', async () => {
    const householdId = 'household-replace';
    const transactionId = await createSourceTransaction(householdId);
    const beforeSnapshot = await getDocFromServer(transactionRef(householdId, transactionId));
    const before = beforeSnapshot.data();

    await replaceAllocationUseCase.execute(
      replacementRequest(householdId, transactionId, 'INCOME', [
        { projectId: 'project-1', percentage: 25 },
        { projectId: 'project-2', percentage: 75 },
      ]),
    );
    await replaceAllocationUseCase.execute(
      replacementRequest(householdId, transactionId, 'INCOME', [
        { projectId: 'project-3', percentage: 100 },
      ]),
    );

    const [afterSnapshot, allocationSnapshot] = await Promise.all([
      getDocFromServer(transactionRef(householdId, transactionId)),
      getDocsFromServer(collectionRef(householdId, 'allocations')),
    ]);
    const after = afterSnapshot.data();

    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs[0]?.id).toBe(transactionId);
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      items: [{ projectId: 'project-3', percentage: 100, amount: 10000 }],
    });
    expect(after).toMatchObject({
      description: before?.description,
      intent: before?.intent,
      intentType: before?.intentType,
      amount: before?.amount,
      entries: before?.entries,
      allocationId: transactionId,
    });
    expect(after?.createdAt).toEqual(before?.createdAt);
  });

  it('supports EXPENSE source Transactions', async () => {
    const householdId = 'household-expense';
    const transactionId = await createSourceTransaction(householdId, 'EXPENSE', 1000);

    await replaceAllocationUseCase.execute(
      replacementRequest(
        householdId,
        transactionId,
        'EXPENSE',
        [{ projectId: 'project-expense', percentage: 100 }],
        1000,
      ),
    );

    const allocationSnapshot = await getDocsFromServer(collectionRef(householdId, 'allocations'));
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      direction: 'EXPENSE',
      totalAmount: 1000,
    });
  });

  it('normalizes legacy random-ID Allocations and removes duplicate current records', async () => {
    const householdId = 'household-legacy';
    const transactionId = await createSourceTransaction(householdId);
    const firstLegacyId = await createLegacyAllocation(
      householdId,
      transactionId,
      'legacy-allocation-1',
    );
    const secondLegacyId = await createLegacyAllocation(
      householdId,
      transactionId,
      'legacy-allocation-2',
    );
    await transactionRepository.updateAllocationId(
      householdId,
      transactionId,
      firstLegacyId,
      'user@example.com',
    );

    await replaceAllocationUseCase.execute(
      replacementRequest(householdId, transactionId, 'INCOME', [
        { projectId: 'project-new', percentage: 100 },
      ]),
    );

    const [transactionSnapshot, allocationSnapshot] = await Promise.all([
      getDocFromServer(transactionRef(householdId, transactionId)),
      getDocsFromServer(collectionRef(householdId, 'allocations')),
    ]);
    const allocationIds = allocationSnapshot.docs.map((allocationDoc) => allocationDoc.id);

    expect(allocationIds).toEqual([transactionId]);
    expect(allocationIds).not.toContain(firstLegacyId);
    expect(allocationIds).not.toContain(secondLegacyId);
    expect(transactionSnapshot.data()).toMatchObject({ allocationId: transactionId });
  });

  it('rolls back the source link and Allocation when the Allocation write fails', async () => {
    const householdId = 'household-rollback';
    const transactionId = await createSourceTransaction(householdId);
    const failure = vi
      .spyOn(allocationRepository, 'create')
      .mockRejectedValueOnce(new Error('allocation write failed'));

    try {
      await expect(
        replaceAllocationUseCase.execute(
          replacementRequest(householdId, transactionId, 'INCOME', [
            { projectId: 'project-1', percentage: 100 },
          ]),
        ),
      ).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
    } finally {
      failure.mockRestore();
    }

    const [transactionSnapshot, allocationSnapshot] = await Promise.all([
      getDocFromServer(transactionRef(householdId, transactionId)),
      getDocsFromServer(collectionRef(householdId, 'allocations')),
    ]);

    expect(transactionSnapshot.data()).toMatchObject({ allocationId: null });
    expect(allocationSnapshot.docs).toHaveLength(0);
  });

  it('keeps the previous Allocation and link when replacement update fails', async () => {
    const householdId = 'household-update-rollback';
    const transactionId = await createSourceTransaction(householdId);
    await replaceAllocationUseCase.execute(
      replacementRequest(householdId, transactionId, 'INCOME', [
        { projectId: 'project-old', percentage: 100 },
      ]),
    );
    const failure = vi
      .spyOn(allocationRepository, 'update')
      .mockRejectedValueOnce(new Error('allocation update failed'));

    try {
      await expect(
        replaceAllocationUseCase.execute(
          replacementRequest(householdId, transactionId, 'INCOME', [
            { projectId: 'project-new', percentage: 100 },
          ]),
        ),
      ).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
    } finally {
      failure.mockRestore();
    }

    const allocationSnapshot = await getDocsFromServer(collectionRef(householdId, 'allocations'));
    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      items: [{ projectId: 'project-old', percentage: 100, amount: 10000 }],
    });
  });

  it('serializes concurrent replacements to one current Allocation', async () => {
    const householdId = 'household-concurrent';
    const transactionId = await createSourceTransaction(householdId);
    const firstRequest = replacementRequest(householdId, transactionId, 'INCOME', [
      { projectId: 'project-1', percentage: 100 },
    ]);
    const secondRequest = replacementRequest(householdId, transactionId, 'INCOME', [
      { projectId: 'project-2', percentage: 100 },
    ]);

    await Promise.all([
      replaceAllocationUseCase.execute(firstRequest),
      replaceAllocationUseCase.execute(secondRequest),
    ]);

    const [transactionSnapshot, allocationSnapshot] = await Promise.all([
      getDocFromServer(transactionRef(householdId, transactionId)),
      getDocsFromServer(collectionRef(householdId, 'allocations')),
    ]);

    expect(allocationSnapshot.docs).toHaveLength(1);
    expect(allocationSnapshot.docs[0]?.id).toBe(transactionId);
    expect(allocationSnapshot.docs[0]?.data()).toMatchObject({
      items: [
        expect.objectContaining({
          projectId: expect.stringMatching(/^project-[12]$/),
          percentage: 100,
        }),
      ],
    });
    expect(transactionSnapshot.data()).toMatchObject({ allocationId: transactionId });
  });
});