import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  serverTimestamp,
  terminate,
} from 'firebase/firestore';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Mock toggle: when true, writeChildrenInTransaction throws to simulate a
// child-write failure inside the Firestore transaction. The mock factory
// delegates to the real implementation otherwise.
let shouldFailChildWrite = false;

vi.mock('@/infra/repositories/retirementSubcollectionHelpers', async (importActual) => {
  const actual = await importActual<typeof import('@/infra/repositories/retirementSubcollectionHelpers')>();
  return {
    ...actual,
    writeChildrenInTransaction: (...args: Parameters<typeof actual.writeChildrenInTransaction>) => {
      if (shouldFailChildWrite) {
        throw new Error('injected failure');
      }
      return actual.writeChildrenInTransaction(...args);
    },
  };
});

import {
  RetirementPlanCommandErrorCode,
  RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT,
} from '@/domains/retirement/retirementPlanErrors';
import { createRetirementPlanUseCase } from './createRetirementPlanUseCase';
import { deleteRetirementPlanUseCase } from './deleteRetirementPlanUseCase';
import { duplicateRetirementPlanUseCase } from './duplicateRetirementPlanUseCase';
import { updateRetirementPlanUseCase } from './updateRetirementPlanUseCase';
import { emulatorProjectId, firestoreEmulator } from '@/test/emulatorEnv';
import { resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', isGlobalAdmin: true };
const userEmail = 'user@example.com';

// Fresh Firestore instance per verification: the long-lived shared instance
// serves stale local snapshots after transaction deletes on this SDK version.
const readerApps: FirebaseApp[] = [];

const makeReaderDb = () => {
  const app = initializeApp({ projectId: emulatorProjectId }, `reader-${readerApps.length}`);
  connectFirestoreEmulator(getFirestore(app), firestoreEmulator.host, firestoreEmulator.port);
  readerApps.push(app);
  return getFirestore(app);
};

const readFresh = async <T>(read: (db: ReturnType<typeof getFirestore>) => Promise<T>): Promise<T> => {
  const db = makeReaderDb();
  try {
    return await read(db);
  } finally {
    await terminate(db);
  }
};

const planDoc = (db: ReturnType<typeof getFirestore>, householdId: string, planId: string) =>
  doc(db, 'households', householdId, 'retirement_plans', planId);

const incomeStreams = (
  db: ReturnType<typeof getFirestore>,
  householdId: string,
  planId: string,
) => collection(db, 'households', householdId, 'retirement_plans', planId, 'incomeStreams');

const expenseCategories = (
  db: ReturnType<typeof getFirestore>,
  householdId: string,
  planId: string,
) =>
  collection(
    db,
    'households',
    householdId,
    'retirement_plans',
    planId,
    'expenseCategories',
  );

const basePlan = (overrides: Record<string, unknown> = {}) => ({
  name: 'Plan',
  isActive: false,
  autoUpdate: false,
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  currentSavings: 0,
  salaryGrowthRate: 3,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [],
  expenses: [],
  events: [],
  ...overrides,
});

const incomeFixture = (id: string) => ({
  id,
  name: id,
  type: 'salary',
  startYear: 2026,
  currentAnnual: 1000,
  growthRate: 0,
  lifelong: true,
});

const expenseFixture = (id: string) => ({
  id,
  name: id,
  type: 'general',
  currentAnnual: 1000,
  growthRate: 0,
  retirementMultiplier: 1,
  startYear: 2026,
});

const seedPlan = async (
  householdId: string,
  planId: string,
  overrides: Record<string, unknown> = {},
) => {
  const db = makeReaderDb();
  await setDoc(planDoc(db, householdId, planId), {
    id: planId,
    ...basePlan({ name: planId, ...overrides }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userEmail,
    updatedBy: userEmail,
  });
  await terminate(db);
};

const seedIncome = async (householdId: string, planId: string, id: string) => {
  const db = makeReaderDb();
  await setDoc(doc(incomeStreams(db, householdId, planId), id), {
    ...incomeFixture(id),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await terminate(db);
};

const seedExpense = async (householdId: string, planId: string, id: string) => {
  const db = makeReaderDb();
  await setDoc(doc(expenseCategories(db, householdId, planId), id), {
    ...expenseFixture(id),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await terminate(db);
};

describe('Retirement plan atomic writes with Firestore Emulator', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  afterEach(async () => {
    await Promise.all(readerApps.splice(0).map((app) => deleteApp(app)));
    await vi.restoreAllMocks();
  });

  it('creates the plan, children, and active fan-out in one command', async () => {
    const householdId = 'household-create';
    await seedPlan(householdId, 'plan-old', { isActive: true });

    const planId = await createRetirementPlanUseCase.execute({
      householdId,
      plan: basePlan({
        isActive: true,
        incomes: [incomeFixture('income-1')],
        expenses: [expenseFixture('expense-1')],
      }),
      userEmail,
      auth,
    });

    const planData = await readFresh(async (db) => {
      const snapshot = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      const plan = snapshot.docs.find((docSnapshot) => docSnapshot.id === planId);
      const incomes = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', planId, 'incomeStreams'),
      );
      const expenses = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', planId, 'expenseCategories'),
      );
      return {
        plan: plan?.data(),
        incomeIds: incomes.docs.map((incomeDoc) => incomeDoc.id),
        expenseIds: expenses.docs.map((expenseDoc) => expenseDoc.id),
        activeCount: snapshot.docs.filter((docSnapshot) => docSnapshot.data().isActive).length,
      };
    });

    expect(planData.plan).toMatchObject({ isActive: true, name: 'Plan' });
    expect(planData.plan?.incomes).toBeUndefined();
    expect(planData.plan?.expenses).toBeUndefined();
    expect(planData.incomeIds).toEqual(['income-1']);
    expect(planData.expenseIds).toEqual(['expense-1']);
    expect(planData.activeCount).toBe(1);
  });

  it('rolls back the whole create when a child write fails', async () => {
    const householdId = 'household-create-rollback';
    await seedPlan(householdId, 'plan-old', { isActive: true });

    shouldFailChildWrite = true;
    try {
      await expect(
        createRetirementPlanUseCase.execute({
          householdId,
          plan: basePlan({ isActive: true }),
          userEmail,
          auth,
        }),
      ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.TRANSACTION_FAILED });
    } finally {
      shouldFailChildWrite = false;
    }

    const state = await readFresh(async (db) => {
      const snapshot = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      return {
        planCount: snapshot.docs.length,
        oldActive: snapshot.docs.find((docSnapshot) => docSnapshot.id === 'plan-old')?.data()
          ?.isActive,
      };
    });

    expect(state.planCount).toBe(1);
    expect(state.oldActive).toBe(true);
  });

  it('serializes concurrent activations to a single active plan', async () => {
    const householdId = 'household-concurrent';
    await seedPlan(householdId, 'plan-a');
    await seedPlan(householdId, 'plan-b');

    await Promise.all([
      updateRetirementPlanUseCase.execute({
        householdId,
        planId: 'plan-a',
        updates: { isActive: true },
        userEmail,
        auth,
      }),
      updateRetirementPlanUseCase.execute({
        householdId,
        planId: 'plan-b',
        updates: { isActive: true },
        userEmail,
        auth,
      }),
    ]);

    const activeIds = await readFresh(async (db) => {
      const snapshot = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      return snapshot.docs
        .filter((docSnapshot) => docSnapshot.data().isActive)
        .map((docSnapshot) => docSnapshot.id);
    });

    expect(activeIds).toHaveLength(1);
    expect(activeIds[0]).toMatch(/^plan-[ab]$/);
  });

  it('replaces children atomically', async () => {
    const householdId = 'household-update';
    await seedPlan(householdId, 'plan-1');
    await seedIncome(householdId, 'plan-1', 'income-old');

    await updateRetirementPlanUseCase.execute({
      householdId,
      planId: 'plan-1',
      updates: { name: 'Renamed', incomes: [incomeFixture('income-new')] },
      userEmail,
      auth,
    });

    const state = await readFresh(async (db) => {
      const plan = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      const incomes = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', 'plan-1', 'incomeStreams'),
      );
      return {
        name: plan.docs.find((docSnapshot) => docSnapshot.id === 'plan-1')?.data()?.name,
        incomeIds: incomes.docs.map((incomeDoc) => incomeDoc.id),
      };
    });

    expect(state.name).toBe('Renamed');
    expect(state.incomeIds).toEqual(['income-new']);
  });

  it('keeps zero active plans valid when the only active plan deactivates', async () => {
    const householdId = 'household-deactivate';
    await seedPlan(householdId, 'plan-a', { isActive: true });

    await updateRetirementPlanUseCase.execute({
      householdId,
      planId: 'plan-a',
      updates: { isActive: false },
      userEmail,
      auth,
    });

    const activeCount = await readFresh(async (db) => {
      const snapshot = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      return snapshot.docs.filter((docSnapshot) => docSnapshot.data().isActive).length;
    });

    expect(activeCount).toBe(0);
  });

  it('rejects updates for a missing plan with PLAN_NOT_FOUND', async () => {
    await expect(
      updateRetirementPlanUseCase.execute({
        householdId: 'household-missing',
        planId: 'plan-missing',
        updates: { name: 'Renamed' },
        userEmail,
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_NOT_FOUND });
  });

  it('duplicates a plan atomically as an inactive copy with children', async () => {
    const householdId = 'household-duplicate';
    await seedPlan(householdId, 'plan-a', { isActive: true });
    await seedIncome(householdId, 'plan-a', 'income-1');
    await seedExpense(householdId, 'plan-a', 'expense-1');

    const copyId = await duplicateRetirementPlanUseCase.execute({
      householdId,
      sourcePlanId: 'plan-a',
      userEmail,
      auth,
    });

    const state = await readFresh(async (db) => {
      const snapshot = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans'),
      );
      const copy = snapshot.docs.find((docSnapshot) => docSnapshot.id === copyId);
      const copyIncomes = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', copyId, 'incomeStreams'),
      );
      const copyExpenses = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', copyId, 'expenseCategories'),
      );
      return {
        copy: copy?.data(),
        incomeIds: copyIncomes.docs.map((incomeDoc) => incomeDoc.id),
        expenseIds: copyExpenses.docs.map((expenseDoc) => expenseDoc.id),
        activeIds: snapshot.docs
          .filter((docSnapshot) => docSnapshot.data().isActive)
          .map((docSnapshot) => docSnapshot.id),
      };
    });

    expect(state.copy).toMatchObject({ name: 'plan-a (Copy)', isActive: false });
    expect(state.incomeIds).toEqual(['income-1']);
    expect(state.expenseIds).toEqual(['expense-1']);
    expect(state.activeIds).toEqual(['plan-a']);
  });

  it('deletes children and the main document in one command', async () => {
    const householdId = 'household-delete';
    await seedPlan(householdId, 'plan-a');
    await seedIncome(householdId, 'plan-a', 'income-1');

    await deleteRetirementPlanUseCase.execute({ householdId, planId: 'plan-a', auth });

    const state = await readFresh(async (db) => {
      const plan = await getDocs(collection(db, 'households', householdId, 'retirement_plans'));
      const incomes = await getDocs(
        collection(db, 'households', householdId, 'retirement_plans', 'plan-a', 'incomeStreams'),
      );
      return { planExists: plan.docs.length > 0, incomeIds: incomes.docs.map((d) => d.id) };
    });

    expect(state.planExists).toBe(false);
    expect(state.incomeIds).toEqual([]);
  });

  it('rejects payloads whose write count exceeds the transaction limit', async () => {
    const householdId = 'household-oversize';
    const oversize = RETIREMENT_PLAN_TRANSACTION_WRITE_LIMIT;
    const incomes = Array.from({ length: oversize }, (_, index) =>
      incomeFixture(`income-${index}`),
    );

    await expect(
      createRetirementPlanUseCase.execute({
        householdId,
        plan: basePlan({ incomes }),
        userEmail,
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_TOO_LARGE });
  });
});
