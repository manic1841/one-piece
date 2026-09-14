import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { watchListRepository } from '@/infra/repositories/watchListRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: true };
const year = 2026;
const month = 9;

// Unique household IDs per test keep reads cache-cold after resetMockDb
// (see firestore-emulator gotchas).
let householdSeq = 0;

const seedProject = async (householdId: string, projectId: string, isActive = true) => {
  await setDoc(doc(db, 'households', householdId, 'projects', projectId), {
    id: projectId,
    name: `Project ${projectId}`,
    description: '',
    color: '#000000',
    icon: 'default',
    category: 'OPERATING',
    isActive,
    order: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedAllocation = async (
  householdId: string,
  allocationId: string,
  yearMonth: string,
  items: { projectId: string; percentage: number; amount: number }[],
) => {
  await setDoc(doc(db, 'households', householdId, 'allocations', allocationId), {
    id: allocationId,
    sourceTransactionId: `tx-${allocationId}`,
    date: new Date(2026, 8, 10),
    yearMonth,
    direction: 'INCOME',
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    items,
    projectIds: items.map((item) => item.projectId),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedTransaction = async (
  householdId: string,
  transactionId: string,
  date: Date,
  amount: number,
  ledgerCodes: string[],
) => {
  await setDoc(doc(db, 'households', householdId, 'transactions', transactionId), {
    id: transactionId,
    date,
    description: '',
    intentType: 'EXPENSE',
    amount,
    projectId: null,
    allocationId: null,
    ledgerCodes,
    entries: ledgerCodes.map((ledgerCode) => ({
      ledgerCode,
      debit: ledgerCode.startsWith('expense:') ? amount : 0,
      credit: ledgerCode.startsWith('expense:') ? 0 : amount,
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

describe('checkSettlementCompletenessUseCase — emulator integration', () => {
  beforeEach(async () => {
    await resetMockDb();
    householdSeq += 1;
  });

  const householdId = () => `household-completeness-${householdSeq}`;

  it('passes with an empty watch list', async () => {
    const HOUSEHOLD = householdId();

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.yearMonth).toBe('2026-09');
    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
  });

  it('reports zero activity for a watched project without allocations', async () => {
    const HOUSEHOLD = householdId();
    await seedProject(HOUSEHOLD, 'p-active');
    await seedProject(HOUSEHOLD, 'p-empty');
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'p-active', name: 'Project p-active' },
      'user@example.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'p-empty', name: 'Project p-empty' },
      'user@example.com',
    );
    await seedAllocation(HOUSEHOLD, 'alloc-1', '2026-09', [
      { projectId: 'p-active', percentage: 100, amount: 500 },
    ]);

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.anomalies).toEqual([
      {
        targetType: 'PROJECT',
        targetId: 'p-empty',
        name: 'Project p-empty',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
    const activeActivity = result.activities.find((a) => a.targetId === 'p-active');
    expect(activeActivity).toEqual(
      expect.objectContaining({ status: 'HAS_ACTIVITY', activityCount: 1, activityAmount: 500 }),
    );
  });

  it('counts watched ledger codes from denormalized transaction indexes', async () => {
    const HOUSEHOLD = householdId();
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'LEDGER_CODE', targetId: 'expense:food', name: '餐飲' },
      'user@example.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'LEDGER_CODE', targetId: 'expense:travel', name: '差旅費' },
      'user@example.com',
    );
    await seedTransaction(HOUSEHOLD, 'tx-1', new Date(2026, 8, 15), 200, [
      'expense:food',
      'asset:cash',
    ]);
    await seedTransaction(HOUSEHOLD, 'tx-2', new Date(2026, 8, 20), 300, [
      'expense:food',
      'asset:cash',
    ]);
    // Outside the target month: must not count.
    await seedTransaction(HOUSEHOLD, 'tx-out', new Date(2026, 7, 20), 999, [
      'expense:travel',
      'asset:cash',
    ]);

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.anomalies).toEqual([
      {
        targetType: 'LEDGER_CODE',
        targetId: 'expense:travel',
        name: '差旅費',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
    const food = result.activities.find((a) => a.targetId === 'expense:food');
    expect(food).toEqual(
      expect.objectContaining({ status: 'HAS_ACTIVITY', activityCount: 2, activityAmount: 500 }),
    );
  });

  it('skips watched projects that are inactive', async () => {
    const HOUSEHOLD = householdId();
    await seedProject(HOUSEHOLD, 'p-inactive', false);
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'p-inactive', name: 'Project p-inactive' },
      'user@example.com',
    );

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
  });
});
