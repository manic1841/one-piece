import { type DocumentData, type DocumentReference, doc, writeBatch } from 'firebase/firestore';

import { db } from '@/firebase';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

import { type HouseholdBackupPayload } from './exportHouseholdBackupUseCase';

export interface ExistingHouseholdData {
  accounts: Array<{ id: string }>;
  projects: Array<{ id: string }>;
  portfolios: Array<{ id: string }>;
  debtAccounts: Array<{ id: string }>;
  retirementPlans: Array<{
    id: string;
    incomes: Array<{ id: string }>;
    expenses: Array<{ id: string }>;
  }>;
  transactions: Array<{ id: string }>;
  reports: Array<{ id: string }>;
  allocations: Array<{ id: string }>;
  allocationTemplates: Array<{ id: string }>;
  ledgerCodes: Array<{ id: string }>;
  intentMappings: Array<{ id: string }>;
}

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toDocRef = (path: string): DocumentReference<DocumentData> => doc(db, path);

const getId = (entity: unknown): string => {
  if (isRecord(entity) && typeof entity.id === 'string' && entity.id) {
    return entity.id;
  }
  return '';
};

export const buildDeleteRefs = async (
  householdId: string,
  existing: ExistingHouseholdData,
): Promise<DocumentReference<DocumentData>[]> => {
  const refs: DocumentReference<DocumentData>[] = [];

  existing.accounts.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/accounts/${item.id}`)),
  );
  existing.projects.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/projects/${item.id}`)),
  );
  existing.portfolios.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/portfolios/${item.id}`)),
  );
  existing.debtAccounts.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/debtAccounts/${item.id}`)),
  );

  existing.retirementPlans.forEach((plan) => {
    refs.push(toDocRef(`households/${householdId}/retirement_plans/${plan.id}`));
    plan.incomes.forEach((income) =>
      refs.push(
        toDocRef(
          `households/${householdId}/retirement_plans/${plan.id}/incomeStreams/${income.id}`,
        ),
      ),
    );
    plan.expenses.forEach((expense) =>
      refs.push(
        toDocRef(
          `households/${householdId}/retirement_plans/${plan.id}/expenseCategories/${expense.id}`,
        ),
      ),
    );
  });

  existing.transactions.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/transactions/${item.id}`)),
  );
  existing.reports.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/reports/${item.id}`)),
  );
  existing.allocations.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/allocations/${item.id}`)),
  );
  existing.allocationTemplates.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/allocationTemplates/${item.id}`)),
  );
  existing.ledgerCodes.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/ledgerCodes/${item.id}`)),
  );
  existing.intentMappings.forEach((item) =>
    refs.push(toDocRef(`households/${householdId}/intent_mappings/${item.id}`)),
  );

  const [accountSnapshotRefs, projectSnapshotRefs, portfolioSnapshotRefs, debtSnapshotRefs] =
    await Promise.all([
      Promise.all(
        existing.accounts.map(async (item) => {
          const snapshots = await accountSnapshotRepository.list([householdId, item.id]);
          return snapshots.map((s) =>
            toDocRef(`households/${householdId}/accounts/${item.id}/snapshots/${s.id}`),
          );
        }),
      ),
      Promise.all(
        existing.projects.map(async (item) => {
          const snapshots = await projectSnapshotRepository.list([householdId, item.id]);
          return snapshots.map((s) =>
            toDocRef(`households/${householdId}/projects/${item.id}/snapshots/${s.id}`),
          );
        }),
      ),
      Promise.all(
        existing.portfolios.map(async (item) => {
          const snapshots = await portfolioSnapshotRepository.list([householdId, item.id]);
          return snapshots.map((s) =>
            toDocRef(`households/${householdId}/portfolios/${item.id}/snapshots/${s.id}`),
          );
        }),
      ),
      Promise.all(
        existing.debtAccounts.map(async (item) => {
          const snapshots = await debtSnapshotRepository.list([householdId, item.id]);
          return snapshots.map((s) =>
            toDocRef(`households/${householdId}/debtAccounts/${item.id}/snapshots/${s.id}`),
          );
        }),
      ),
    ]);

  accountSnapshotRefs.flat().forEach((ref) => refs.push(ref));
  projectSnapshotRefs.flat().forEach((ref) => refs.push(ref));
  portfolioSnapshotRefs.flat().forEach((ref) => refs.push(ref));
  debtSnapshotRefs.flat().forEach((ref) => refs.push(ref));

  return refs;
};

export const buildSetOps = (
  householdId: string,
  backupData: HouseholdBackupPayload,
): Array<{ ref: DocumentReference<DocumentData>; data: DocumentData }> => {
  const ops: Array<{ ref: DocumentReference<DocumentData>; data: DocumentData }> = [];

  ops.push({
    ref: toDocRef(`households/${householdId}`),
    data: backupData.household as DocumentData,
  });

  backupData.collections.accounts.forEach(({ account, snapshots }) => {
    const id = getId(account);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/accounts/${id}`),
      data: account as DocumentData,
    });
    snapshots.forEach((snapshot) => {
      const snapshotId = getId(snapshot);
      if (!snapshotId) return;
      ops.push({
        ref: toDocRef(`households/${householdId}/accounts/${id}/snapshots/${snapshotId}`),
        data: snapshot as DocumentData,
      });
    });
  });

  backupData.collections.projects.forEach(({ project, snapshots }) => {
    const id = getId(project);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/projects/${id}`),
      data: project as DocumentData,
    });
    snapshots.forEach((snapshot) => {
      const snapshotId = getId(snapshot);
      if (!snapshotId) return;
      ops.push({
        ref: toDocRef(`households/${householdId}/projects/${id}/snapshots/${snapshotId}`),
        data: snapshot as DocumentData,
      });
    });
  });

  backupData.collections.portfolios.forEach(({ portfolio, snapshots }) => {
    const id = getId(portfolio);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/portfolios/${id}`),
      data: portfolio as DocumentData,
    });
    snapshots.forEach((snapshot) => {
      const snapshotId = getId(snapshot);
      if (!snapshotId) return;
      ops.push({
        ref: toDocRef(`households/${householdId}/portfolios/${id}/snapshots/${snapshotId}`),
        data: snapshot as DocumentData,
      });
    });
  });

  backupData.collections.debtAccounts.forEach(({ debtAccount, snapshots }) => {
    const id = getId(debtAccount);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/debtAccounts/${id}`),
      data: debtAccount as DocumentData,
    });
    snapshots.forEach((snapshot) => {
      const snapshotId = getId(snapshot);
      if (!snapshotId) return;
      ops.push({
        ref: toDocRef(`households/${householdId}/debtAccounts/${id}/snapshots/${snapshotId}`),
        data: snapshot as DocumentData,
      });
    });
  });

  backupData.collections.retirementPlans.forEach((plan) => {
    const planRecord = plan as Record<string, unknown>;
    const planId = getId(planRecord);
    if (!planId) return;

    ops.push({
      ref: toDocRef(`households/${householdId}/retirement_plans/${planId}`),
      data: planRecord as DocumentData,
    });

    const incomes = Array.isArray(planRecord.incomes) ? planRecord.incomes : [];
    const expenses = Array.isArray(planRecord.expenses) ? planRecord.expenses : [];

    incomes.forEach((income) => {
      const id = getId(income);
      if (!id) return;
      ops.push({
        ref: toDocRef(`households/${householdId}/retirement_plans/${planId}/incomeStreams/${id}`),
        data: income as DocumentData,
      });
    });

    expenses.forEach((expense) => {
      const id = getId(expense);
      if (!id) return;
      ops.push({
        ref: toDocRef(
          `households/${householdId}/retirement_plans/${planId}/expenseCategories/${id}`,
        ),
        data: expense as DocumentData,
      });
    });
  });

  backupData.collections.transactions.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/transactions/${id}`),
      data: item as DocumentData,
    });
  });

  backupData.collections.reports.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/reports/${id}`),
      data: item as DocumentData,
    });
  });

  backupData.collections.allocations.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/allocations/${id}`),
      data: item as DocumentData,
    });
  });

  backupData.collections.allocationTemplates.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/allocationTemplates/${id}`),
      data: item as DocumentData,
    });
  });

  backupData.collections.ledgerCodes.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/ledgerCodes/${id}`),
      data: item as DocumentData,
    });
  });

  backupData.collections.intentMappings.forEach((item) => {
    const id = getId(item);
    if (!id) return;
    ops.push({
      ref: toDocRef(`households/${householdId}/intent_mappings/${id}`),
      data: item as DocumentData,
    });
  });

  return ops;
};

export const commitDeletes = async (
  deleteRefs: DocumentReference<DocumentData>[],
): Promise<void> => {
  const chunkSize = 400;
  for (let i = 0; i < deleteRefs.length; i += chunkSize) {
    const batch = writeBatch(db);
    deleteRefs.slice(i, i + chunkSize).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

export const commitSets = async (
  setOps: Array<{ ref: DocumentReference<DocumentData>; data: DocumentData }>,
): Promise<void> => {
  const chunkSize = 400;
  for (let i = 0; i < setOps.length; i += chunkSize) {
    const batch = writeBatch(db);
    setOps.slice(i, i + chunkSize).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }
};
