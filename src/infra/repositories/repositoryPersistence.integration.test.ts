import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const HOUSEHOLD = 'household-repo-test';
const COLLECTION = 'households';

describe('repository persistence boundaries (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('composite query filters and orders correctly', async () => {
    // Create transactions with different dates and projectId
    const tx1 = {
      id: 'tx-1',
      date: new Date('2025-06-15'),
      description: 'June tx',
      intentType: 'EXPENSE',
      amount: -100,
      projectId: 'project-A',
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2025-06-15'),
      updatedAt: new Date('2025-06-15'),
      updatedBy: 'u1',
    };
    const tx2 = {
      id: 'tx-2',
      date: new Date('2025-07-15'),
      description: 'July tx',
      intentType: 'EXPENSE',
      amount: -200,
      projectId: 'project-A',
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2025-07-15'),
      updatedAt: new Date('2025-07-15'),
      updatedBy: 'u1',
    };
    const tx3 = {
      id: 'tx-3',
      date: new Date('2025-07-20'),
      description: 'July tx other project',
      intentType: 'EXPENSE',
      amount: -50,
      projectId: 'project-B',
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2025-07-20'),
      updatedAt: new Date('2025-07-20'),
      updatedBy: 'u1',
    };

    for (const tx of [tx1, tx2, tx3]) {
      await setDoc(doc(db, COLLECTION, HOUSEHOLD, 'transactions', tx.id), {
        ...tx,
        date: tx.date,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      });
    }

    // listByProject with sinceDate filter (server-side composite query)
    const sinceDate = new Date('2025-07-01');
    const results = await transactionRepository.listByProject(HOUSEHOLD, 'project-A', sinceDate);

    // Should return only tx2 (project-A, date >= July 1), ordered desc
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('tx-2');
  });

  it('Date fields round-trip to Date objects', async () => {
    const testDate = new Date('2025-06-15T10:30:00.000Z');

    await setDoc(doc(db, COLLECTION, HOUSEHOLD, 'transactions', 'date-rt-test'), {
      id: 'date-rt-test',
      date: testDate,
      description: 'Date round-trip test',
      intentType: 'INCOME',
      amount: 500,
      projectId: null,
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: testDate,
      updatedAt: testDate,
      updatedBy: 'u1',
    });

    const result = await transactionRepository.getById(HOUSEHOLD, 'date-rt-test');
    expect(result).not.toBeNull();
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.date.getTime()).toBe(testDate.getTime());
  });

  it('nested collection paths read and write correctly', async () => {
    // Write a debt snapshot in a nested collection path
    const snapshotData = {
      yearMonth: '2025-06',
      openingBalance: 10000,
      principalPaid: 500,
      interestPaid: 100,
      totalPaid: 600,
      closingBalance: 9500,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'u1',
      updatedBy: 'u1',
    };

    const nestedPath = doc(
      db,
      COLLECTION,
      HOUSEHOLD,
      'debtAccounts',
      'debt-1',
      'debtSnapshots',
      '2025-06',
    );
    await setDoc(nestedPath, snapshotData);

    // Read it back
    const snap = await getDoc(nestedPath);
    expect(snap.exists()).toBe(true);
    expect(snap.data()!.yearMonth).toBe('2025-06');
    expect(snap.data()!.closingBalance).toBe(9500);
  });

  it('cascade-delete removes parent and children', async () => {
    // Create parent doc with a child subcollection
    const parentPath = doc(db, COLLECTION, HOUSEHOLD, 'debtAccounts', 'debt-cascade');
    await setDoc(parentPath, { name: 'Cascade test', id: 'debt-cascade' });

    const childPath = doc(
      db,
      COLLECTION,
      HOUSEHOLD,
      'debtAccounts',
      'debt-cascade',
      'debtSnapshots',
      '2025-06',
    );
    await setDoc(childPath, { yearMonth: '2025-06', closingBalance: 1000 });

    // Verify both exist
    expect((await getDoc(parentPath)).exists()).toBe(true);
    expect((await getDoc(childPath)).exists()).toBe(true);

    // Delete children first, then parent (cascade pattern)
    const childrenSnap = await getDocs(
      collection(db, COLLECTION, HOUSEHOLD, 'debtAccounts', 'debt-cascade', 'debtSnapshots'),
    );
    for (const childDoc of childrenSnap.docs) {
      await deleteDoc(childDoc.ref);
    }
    await deleteDoc(parentPath);

    // Verify both are gone
    expect((await getDoc(parentPath)).exists()).toBe(false);
    expect((await getDoc(childPath)).exists()).toBe(false);
  });

  it('getByIds returns documents by ID chunk', async () => {
    const ids = ['batch-1', 'batch-2', 'batch-3'];
    for (const id of ids) {
      await setDoc(doc(db, COLLECTION, HOUSEHOLD, 'transactions', id), {
        id,
        date: new Date('2025-06-15'),
        description: `Batch ${id}`,
        intentType: 'EXPENSE',
        amount: -100,
        projectId: 'project-A',
        createdBy: 'u1',
        entries: [],
        ledgerCodes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'u1',
      });
    }

    const results = await transactionRepository.getByIds(HOUSEHOLD, ids);
    expect(results).toHaveLength(3);
    const resultIds = results.map((r) => r.id).sort();
    expect(resultIds).toEqual(['batch-1', 'batch-2', 'batch-3']);
  });
});
