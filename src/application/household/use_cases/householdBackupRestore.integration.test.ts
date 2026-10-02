import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { exportHouseholdBackupUseCase } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import type { HouseholdBackupPayload } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import { importHouseholdBackupUseCase } from '@/application/household/use_cases/importHouseholdBackupUseCase';
import type { AuthContext } from '@/application/types';
import { initialStageStates } from '@/domains/financial_period/schemas';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { watchListRepository } from '@/infra/repositories/watchListRepository';
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
      doc(db, `households/${householdId}/${parentCollection}/${parentId}/snapshots/snap-${i}`),
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
    const acc1 = restored.collections.accounts.find(
      (a) => (a.account as { id: string }).id === 'acc-1',
    );
    expect(acc1?.snapshots).toHaveLength(2);

    // Verify field-level equality (logical data, not just counts)
    const origAcc1 = original.collections.accounts.find(
      (a) => (a.account as { id: string }).id === 'acc-1',
    );
    expect(acc1?.account).toEqual(origAcc1?.account);
    expect(acc1?.snapshots).toEqual(origAcc1?.snapshots);

    const origTx1 = original.collections.transactions.find(
      (t) => (t as { id: string }).id === 'tx-1',
    );
    const restTx1 = restored.collections.transactions.find(
      (t) => (t as { id: string }).id === 'tx-1',
    );
    expect(restTx1).toEqual(origTx1);

    const origProj = original.collections.projects.find(
      (p) => (p.project as { id: string }).id === 'proj-1',
    );
    const restProj = restored.collections.projects.find(
      (p) => (p.project as { id: string }).id === 'proj-1',
    );
    expect(restProj?.project).toEqual(origProj?.project);
  });

  it('malformed payloads are rejected with explicit errors before partial writes', async () => {
    const hid = 'household-malformed';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);

    const cases: Array<{ label: string; payload: unknown }> = [
      { label: 'null', payload: null },
      {
        label: 'wrong schemaVersion',
        payload: { schemaVersion: 99, householdId: hid, household: {}, collections: {} },
      },
      {
        label: 'missing household',
        payload: { schemaVersion: 1, householdId: hid, collections: {} },
      },
      {
        label: 'missing collections',
        payload: { schemaVersion: 1, householdId: hid, household: {} },
      },
      {
        label: 'mismatched householdId',
        payload: { schemaVersion: 1, householdId: 'other', household: {}, collections: {} },
      },
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

  it('payloads that fail zod validation are rejected before any deletes', async () => {
    const hid = 'household-validation-reject';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);

    // Corrupt a report so the payload fails domain-schema validation.
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });
    const corrupted = structuredClone(payload) as HouseholdBackupPayload;
    corrupted.collections.reports = [
      {
        id: 'bad-report',
        householdId: hid,
        type: 'INCOME_STATEMENT',
        yearMonth: NaN,
        createdBy: 'admin-uid',
        updatedBy: 'admin-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          yearMonth: '2025-01',
          incomeTotal: 0,
          expenseTotal: 0,
          netIncome: 0,
          incomeItems: [],
          expenseItems: [],
        },
      } as unknown as Record<string, unknown>,
    ];

    await expect(
      importHouseholdBackupUseCase.execute({
        householdId: hid,
        auth: adminAuth,
        backup: corrupted,
      }),
    ).rejects.toThrow(/failed validation/);

    const surviving = await getDoc(doc(db, `households/${hid}/accounts/acc-1`));
    expect(surviving.exists(), 'validation failure must not delete existing data').toBe(true);
  });

  it('partial-failure: a mid-restore write failure after successful validation leaves deleted state', async () => {
    const hid = 'household-partial-fail';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);

    // Build a valid export
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    // Corrupt the backup so it passes validation but fails at writeBatch.set:
    // the undefined createdBy survives zod's `.optional()` and reviveDates,
    // but is not a valid Firestore field value, so the batch commit throws.
    const corrupted = structuredClone(payload) as HouseholdBackupPayload;
    corrupted.collections.reports = [
      {
        id: 'bad-report',
        householdId: hid,
        type: 'INCOME_STATEMENT',
        yearMonth: '2025-01',
        createdBy: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          yearMonth: '2025-01',
          incomeTotal: 0,
          expenseTotal: 0,
          netIncome: 0,
          incomeItems: [],
          expenseItems: [],
        },
      } as unknown as Record<string, unknown>,
    ];

    // The undefined createdBy field makes writeBatch.set throw.
    await expect(
      importHouseholdBackupUseCase.execute({
        householdId: hid,
        auth: adminAuth,
        backup: corrupted,
      }),
    ).rejects.toThrow();

    const deletedAccount = await getDoc(doc(db, `households/${hid}/accounts/acc-1`));
    expect(deletedAccount.exists()).toBe(false);

    const household = await getDoc(householdDoc(hid));
    expect(household.exists()).toBe(true);
  });

  it('exports and restores a household with saved reports', async () => {
    const hid = 'household-with-reports';
    await seedHousehold(hid);
    await reportRepository.saveReport(
      hid,
      {
        householdId: hid,
        type: 'INCOME_STATEMENT',
        yearMonth: '2025-01',
        data: {
          yearMonth: '2025-01',
          incomeTotal: 1000,
          expenseTotal: 400,
          netIncome: 600,
          incomeItems: [{ code: 'salary', label: 'Salary', amount: 1000, subItems: [] }],
          expenseItems: [],
        },
      },
      'admin-uid',
    );
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });
    expect(payload.collections.reports).toHaveLength(1);

    await deleteAllInCollection(`households/${hid}/reports`);
    expect(await countDocsInCollection(`households/${hid}/reports`)).toBe(0);

    await importHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
      backup: payload,
    });

    expect(await countDocsInCollection(`households/${hid}/reports`)).toBe(1);
  });

  it('exports and round-trips financialPeriods and watchList', async () => {
    const hid = 'household-optional-collections';
    await seedHousehold(hid);
    await financialPeriodRepository.savePeriod(
      hid,
      {
        yearMonth: '2025-01',
        status: 'IN_PROGRESS',
        stages: {
          ACCOUNT_BALANCE: { status: 'COMPLETED', confirmedAt: NOW, confirmedBy: 'admin-uid' },
        },
      },
      'admin-uid',
    );
    await watchListRepository.addTarget(
      hid,
      { targetType: 'PROJECT', targetId: 'proj-1', name: 'Project proj-1' },
      'admin-uid',
    );

    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });
    expect(payload.collections.financialPeriods).toHaveLength(1);
    expect(payload.collections.watchList).toHaveLength(1);

    await deleteAllInCollection(`households/${hid}/financialPeriods`);
    await deleteAllInCollection(`households/${hid}/watchList`);
    expect(await countDocsInCollection(`households/${hid}/financialPeriods`)).toBe(0);
    expect(await countDocsInCollection(`households/${hid}/watchList`)).toBe(0);

    await importHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
      backup: payload,
    });

    const restoredPeriod = await getDoc(doc(db, `households/${hid}/financialPeriods/2025-01`));
    expect(restoredPeriod.exists()).toBe(true);
    const restoredTarget = await getDoc(doc(db, `households/${hid}/watchList/PROJECT:proj-1`));
    expect(restoredTarget.exists()).toBe(true);
  });

  it('old v1 backups without optional collection keys do not delete local financialPeriods or watchList', async () => {
    const hid = 'household-old-backup';
    await seedHousehold(hid);
    await seedAccounts(hid, ['acc-1']);
    await financialPeriodRepository.savePeriod(
      hid,
      { yearMonth: '2025-01', status: 'OPEN', stages: initialStageStates() },
      'admin-uid',
    );
    await watchListRepository.addTarget(
      hid,
      { targetType: 'DEBT_ACCOUNT', targetId: 'debt-1', name: 'Debt debt-1' },
      'admin-uid',
    );

    // Simulate an old v1 backup: strip the keys added after it was exported.
    const payload = await exportHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });
    const legacyBackup = structuredClone(payload) as HouseholdBackupPayload;
    delete legacyBackup.collections.financialPeriods;
    delete legacyBackup.collections.watchList;

    await importHouseholdBackupUseCase.execute({
      householdId: hid,
      auth: adminAuth,
      backup: legacyBackup,
    });

    expect(await countDocsInCollection(`households/${hid}/financialPeriods`)).toBe(1);
    expect(await countDocsInCollection(`households/${hid}/watchList`)).toBe(1);

    expect(await countDocsInCollection(`households/${hid}/accounts`)).toBe(1);
    const restoredAccount = await getDoc(doc(db, `households/${hid}/accounts/acc-1`));
    expect(restoredAccount.exists()).toBe(true);
  });
});
