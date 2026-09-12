import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { exportHouseholdBackupUseCase } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import { importHouseholdBackupUseCase } from '@/application/household/use_cases/importHouseholdBackupUseCase';
import type { HouseholdBackupPayload } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import type { AuthContext } from '@/application/types';
import { db, resetMockDb } from '@/test/mocks/firebase';

const adminAuth: AuthContext = { uid: 'admin-uid', isGlobalAdmin: false };

function householdDoc(householdId: string) {
  return doc(db, `households/${householdId}`);
}

const NOW = new Date('2025-01-01T00:00:00Z');

const baseFields = {
  createdBy: 'admin-uid',
  createdAt: NOW,
  updatedBy: 'admin-uid',
  updatedAt: NOW,
};

function withBase(id: string, data: Record<string, unknown>): Record<string, unknown> {
  return { id, ...baseFields, ...data };
}

async function seedHousehold(householdId: string) {
  await setDoc(householdDoc(householdId), {
    id: householdId,
    name: `Household ${householdId}`,
    members: { 'admin-uid': { role: 'admin', joinedAt: NOW } },
    ...baseFields,
  });
}

async function seedAccounts(householdId: string, ids: string[]) {
  for (const id of ids) {
    await setDoc(
      doc(db, `households/${householdId}/accounts/${id}`),
      withBase(id, {
        name: `Account ${id}`,
        category: 'bank',
        currency: 'TWD',
        order: 0,
        isActive: true,
      }),
    );
  }
}

async function seedProjects(householdId: string, ids: string[]) {
  for (const id of ids) {
    await setDoc(
      doc(db, `households/${householdId}/projects/${id}`),
      withBase(id, {
        name: `Project ${id}`,
        color: '#000000',
        icon: 'folder',
        order: 0,
        category: 'OPERATING',
        isActive: true,
      }),
    );
  }
}

async function seedTransactions(householdId: string, ids: string[]) {
  for (const id of ids) {
    await setDoc(
      doc(db, `households/${householdId}/transactions/${id}`),
      withBase(id, {
        date: NOW,
        description: `Tx ${id}`,
        amount: -100,
        entries: [],
        ledgerCodes: [],
        projectId: null,
        fromProjectId: null,
        toProjectId: null,
        allocationId: null,
        debtAccountId: null,
      }),
    );
  }
}

async function seedNestedSnapshots(
  householdId: string,
  parentCollection: string,
  parentId: string,
  snapshotCount: number,
) {
  for (let i = 0; i < snapshotCount; i++) {
    await setDoc(
      doc(
        db,
        `households/${householdId}/${parentCollection}/${parentId}/snapshots/snap-${i}`,
      ),
      withBase(`snap-${i}`, {
        accountId: parentId,
        year: 2025,
        month: i + 1,
        amount: 1000 + i,
      }),
    );
  }
}

async function countDocsInCollection(path: string): Promise<number> {
  const snap = await getDocs(collection(db, path));
  return snap.size;
}

async function deleteAllInCollection(path: string) {
  const snap = await getDocs(collection(db, path));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

describe('household backup/restore round-trip (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('export produces a complete payload with nested collections and metadata', async () => {
    const hid = 'household-export';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);
    await seedNestedSnapshots(hid, 'accounts', 'acc-1', 3);
    await seedTransactions(hid, ['tx-1']);

    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(payload.schemaVersion).toBe(1);
    expect(payload.householdId).toBe(hid);
    expect(payload.exportedAt).toBeTruthy();
    expect(payload.household).toBeTruthy();
    expect(payload.collections.accounts).toHaveLength(1);
    expect(payload.collections.accounts[0].snapshots).toHaveLength(3);
    expect(payload.collections.transactions).toHaveLength(1);
  });

  it('import restores a payload so a subsequent export round-trips to the same data', async () => {
    const hid = 'household-roundtrip';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1', 'acc-2']);
    await seedNestedSnapshots(hid, 'accounts', 'acc-1', 2);
    await seedProjects(hid, ['proj-1']);
    await seedTransactions(hid, ['tx-1', 'tx-2']);

    // Export
    const original = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    // Wipe all data except the household doc
    await deleteAllInCollection(`households/${hid}/accounts`);
    await deleteAllInCollection(`households/${hid}/projects`);
    await deleteAllInCollection(`households/${hid}/transactions`);

    // Verify wipe
    expect(await countDocsInCollection(`households/${hid}/accounts`)).toBe(0);
    expect(await countDocsInCollection(`households/${hid}/transactions`)).toBe(0);

    // Import
    const result = await importHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
      backup: original,
    });

    expect(result.restoredDocuments).toBeGreaterThan(0);

    // Re-export and compare logical data
    const restored = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(restored.collections.accounts).toHaveLength(2);
    expect(restored.collections.transactions).toHaveLength(2);
    expect(restored.collections.projects).toHaveLength(1);

    // Account snapshots survived the round-trip
    const acc1 = restored.collections.accounts.find((a) => (a.account as { id: string }).id === 'acc-1');
    expect(acc1?.snapshots).toHaveLength(2);

    // Verify field-level equality (logical data, not just counts)
    const origAcc1 = original.collections.accounts.find((a) => (a.account as { id: string }).id === 'acc-1');
    expect(acc1?.account).toEqual(origAcc1?.account);
    expect(acc1?.snapshots).toEqual(origAcc1?.snapshots);

    const origTx1 = original.collections.transactions.find((t) => (t as { id: string }).id === 'tx-1');
    const restTx1 = restored.collections.transactions.find((t) => (t as { id: string }).id === 'tx-1');
    expect(restTx1).toEqual(origTx1);

    const origProj = original.collections.projects.find((p) => (p.project as { id: string }).id === 'proj-1');
    const restProj = restored.collections.projects.find((p) => (p.project as { id: string }).id === 'proj-1');
    expect(restProj?.project).toEqual(origProj?.project);
  });

  it('malformed payloads are rejected with explicit errors before partial writes', async () => {
    const hid = 'household-malformed';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);

    const cases: Array<{ label: string; payload: unknown }> = [
      { label: 'null', payload: null },
      { label: 'wrong schemaVersion', payload: { schemaVersion: 99, householdId: hid, household: {}, collections: {} } },
      { label: 'missing household', payload: { schemaVersion: 1, householdId: hid, collections: {} } },
      { label: 'missing collections', payload: { schemaVersion: 1, householdId: hid, household: {} } },
      { label: 'mismatched householdId', payload: { schemaVersion: 1, householdId: 'other', household: {}, collections: {} } },
    ];

    for (const { label, payload } of cases) {
      await expect(
        importHouseholdBackupUseCase.execute({
          householdId: hid,
          auth: adminAuth,
          backup: payload as HouseholdBackupPayload,
        }),
      ).rejects.toThrow(Error);

      // The pre-existing account must survive every rejection
      const surviving = await getDoc(doc(db, `households/${hid}/accounts/acc-1`));
      expect(surviving.exists(), `case "${label}" should not mutate data`).toBe(true);
    }
  });

  it('restores larger than one batch chunk complete correctly across multiple 400-operation batches', async () => {
    const hid = 'household-chunked';
    await seedHousehold(hid);

    // Create 450 transactions (exceeds the 400-per-batch chunk size)
    const txIds = Array.from({ length: 450 }, (_, i) => `tx-${i}`);
    await seedTransactions(hid, txIds);

    // Export
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });
    expect(payload.collections.transactions).toHaveLength(450);

    // Wipe
    await deleteAllInCollection(`households/${hid}/transactions`);
    expect(await countDocsInCollection(`households/${hid}/transactions`)).toBe(0);

    // Import — must chunk across multiple batches
    const result = await importHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
      backup: payload,
    });

    // 450 transactions + 1 household = 451 set ops, chunked at 400 → 2 batches
    expect(result.restoredDocuments).toBe(451);

    // All 450 must be present
    expect(await countDocsInCollection(`households/${hid}/transactions`)).toBe(450);
  });

  it('partial-failure: restores delete existing data first, then write; a mid-restore failure leaves deleted state', async () => {
    const hid = 'household-partial-fail';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);

    // Build a valid export
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    // Corrupt the backup data to cause a write failure mid-restore.
    // We keep the structure valid but inject an unserializable value.
    const corrupted = structuredClone(payload) as HouseholdBackupPayload;
    // Replace transaction data with a value that will fail at writeBatch.set
    corrupted.collections.transactions = [
      { id: 'bad-tx', amount: undefined } as unknown as Record<string, unknown>,
    ];

    // The import should delete existing data first, then fail on the write.
    // After failure, the original account is gone (deleted in commitDeletes).
    await expect(
      importHouseholdBackupUseCase.execute({
        householdId: hid,
        auth: adminAuth,
        backup: corrupted,
      }),
    ).rejects.toThrow();

    // The original account was deleted before the write phase started.
    const deletedAccount = await getDoc(doc(db, `households/${hid}/accounts/acc-1`));
    expect(deletedAccount.exists()).toBe(false);

    // The household doc itself survives (it was only in the delete refs if it existed).
    const household = await getDoc(householdDoc(hid));
    expect(household.exists()).toBe(true);
  });
});
