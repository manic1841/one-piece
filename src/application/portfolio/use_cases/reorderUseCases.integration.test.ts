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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reorderAccountsUseCase } from '@/application/account/use_cases/reorderAccountsUseCase';
import { reorderPortfoliosUseCase } from './reorderPortfoliosUseCase';
import { reorderProjectsUseCase } from '@/application/project/use_cases/reorderProjectsUseCase';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', isGlobalAdmin: true };
const userEmail = 'user@example.com';

// Fresh reader per verification: the shared long-lived connection serves stale
// local snapshots after transaction writes on this SDK version.
const readerApps: FirebaseApp[] = [];

const makeReaderDb = () => {
  const app = initializeApp({ projectId: 'demo-project' }, `reorder-reader-${readerApps.length}`);
  connectFirestoreEmulator(getFirestore(app), 'firebase', 8080);
  readerApps.push(app);
  return getFirestore(app);
};

const readFresh = async <T>(
  read: (db: ReturnType<typeof getFirestore>) => Promise<T>,
): Promise<T> => {
  const db = makeReaderDb();
  try {
    return await read(db);
  } finally {
    await terminate(db);
  }
};

const seedDoc = async (
  householdId: string,
  collectionName: string,
  id: string,
  order: number,
) => {
  await setDoc(doc(db, 'households', householdId, collectionName, id), {
    id,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userEmail,
    updatedBy: userEmail,
  });
};

const readOrders = async (householdId: string, collectionName: string) =>
  readFresh(async (reader) => {
    const snapshot = await getDocs(collection(reader, 'households', householdId, collectionName));
    return snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, order: docSnapshot.data().order as number }))
      .sort((a, b) => a.id.localeCompare(b.id));
  });

describe('Reorder atomic contract with Firestore Emulator', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  afterEach(async () => {
    await Promise.all(readerApps.splice(0).map((app) => deleteApp(app)));
    await vi.restoreAllMocks();
  });

  it('applies the full account ordering atomically', async () => {
    const householdId = 'household-accounts';
    await seedDoc(householdId, 'accounts', 'account-1', 0);
    await seedDoc(householdId, 'accounts', 'account-2', 1);
    await seedDoc(householdId, 'accounts', 'account-3', 2);

    await reorderAccountsUseCase.execute({
      householdId,
      accountOrders: [
        { id: 'account-3', order: 0 },
        { id: 'account-1', order: 1 },
        { id: 'account-2', order: 2 },
      ],
      userEmail,
      auth,
    });

    expect(await readOrders(householdId, 'accounts')).toEqual([
      { id: 'account-1', order: 1 },
      { id: 'account-2', order: 2 },
      { id: 'account-3', order: 0 },
    ]);
  });

  it('rolls back the entire project ordering when the write path fails', async () => {
    const householdId = 'household-projects';
    await seedDoc(householdId, 'projects', 'project-1', 0);
    await seedDoc(householdId, 'projects', 'project-2', 1);

    const failure = vi
      .spyOn(projectRepository as unknown as Record<string, unknown>, 'getDocRefById')
      .mockImplementation(() => {
        throw new Error('injected failure');
      });

    try {
      await expect(
        reorderProjectsUseCase.execute({
          householdId,
          projectOrders: [
            { id: 'project-2', order: 0 },
            { id: 'project-1', order: 1 },
          ],
          userEmail,
          auth,
        }),
      ).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
    } finally {
      failure.mockRestore();
    }

    expect(await readOrders(householdId, 'projects')).toEqual([
      { id: 'project-1', order: 0 },
      { id: 'project-2', order: 1 },
    ]);
  });

  it('converges concurrent portfolio reorders to one complete ordering', async () => {
    const householdId = 'household-portfolios';
    await seedDoc(householdId, 'portfolios', 'portfolio-1', 0);
    await seedDoc(householdId, 'portfolios', 'portfolio-2', 1);

    await Promise.all([
      reorderPortfoliosUseCase.execute({
        householdId,
        portfolioOrders: [
          { id: 'portfolio-1', order: 0 },
          { id: 'portfolio-2', order: 1 },
        ],
        userEmail,
        auth,
      }),
      reorderPortfoliosUseCase.execute({
        householdId,
        portfolioOrders: [
          { id: 'portfolio-2', order: 0 },
          { id: 'portfolio-1', order: 1 },
        ],
        userEmail,
        auth,
      }),
    ]);

    const orders = await readOrders(householdId, 'portfolios');
    const byOrder = [...orders].sort((a, b) => a.order - b.order);
    // Either complete ordering is valid: concurrent reorders are serialized by
    // transaction contention, so exactly one command's full desired state wins.
    expect(byOrder.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['portfolio-1', 'portfolio-2']),
    );
    expect(new Set(byOrder.map((entry) => entry.order))).toEqual(new Set([0, 1]));
  });

  it('rejects reorders referencing missing targets with TARGET_NOT_FOUND', async () => {
    const householdId = 'household-missing';
    await seedDoc(householdId, 'accounts', 'account-1', 0);

    await expect(
      reorderAccountsUseCase.execute({
        householdId,
        accountOrders: [
          { id: 'account-1', order: 0 },
          { id: 'account-missing', order: 1 },
        ],
        userEmail,
        auth,
      }),
    ).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });

    expect(await readOrders(householdId, 'accounts')).toEqual([{ id: 'account-1', order: 0 }]);
  });
});
