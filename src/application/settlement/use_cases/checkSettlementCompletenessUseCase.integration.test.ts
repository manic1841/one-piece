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

const seedDebtAccount = async (
  householdId: string,
  debtAccountId: string,
  overrides: Record<string, unknown> = {},
) => {
  await setDoc(doc(db, 'households', householdId, 'debtAccounts', debtAccountId), {
    id: debtAccountId,
    name: `Debt ${debtAccountId}`,
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 1000000,
    currentBalance: 900000,
    interestRate: 2.5,
    startDate: new Date(2026, 0, 15),
    endDate: new Date(2028, 0, 15),
    graceEndDate: null,
    monthlyPayment: 20000,
    linkedLedgerCode: 'liability:mortgage',
    linkedProjectId: null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
    ...overrides,
  });
};

const seedDebtPayment = async (
  householdId: string,
  transactionId: string,
  date: Date,
  debtAccountId: string,
  amount: number,
) => {
  await setDoc(doc(db, 'households', householdId, 'transactions', transactionId), {
    id: transactionId,
    date,
    description: '',
    intentType: 'DEBT_PAYMENT',
    amount,
    projectId: null,
    allocationId: null,
    debtAccountId,
    ledgerCodes: ['liability:mortgage', 'asset:cash'],
    entries: [
      { ledgerCode: 'liability:mortgage', debit: amount, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: amount },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

/** A new loan advanced in the same month: activity on the liability code, not a repayment. */
const seedLiabilityBorrow = async (
  householdId: string,
  transactionId: string,
  date: Date,
  amount: number,
) => {
  await setDoc(doc(db, 'households', householdId, 'transactions', transactionId), {
    id: transactionId,
    date,
    description: '',
    intentType: 'LIABILITY_BORROW',
    amount,
    projectId: null,
    allocationId: null,
    debtAccountId: null,
    ledgerCodes: ['asset:cash', 'liability:mortgage'],
    entries: [
      { ledgerCode: 'asset:cash', debit: amount, credit: 0 },
      { ledgerCode: 'liability:mortgage', debit: 0, credit: amount },
    ],
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

  it('flags a watched debt account with no repayment in the target month', async () => {
    const HOUSEHOLD = householdId();
    await seedDebtAccount(HOUSEHOLD, 'd1', { name: '房貸 A' });
    await seedDebtAccount(HOUSEHOLD, 'd2', { name: '房貸 B' });
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'DEBT_ACCOUNT', targetId: 'd1', name: '房貸 A' },
      'user@example.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      // Stale name snapshot: the live account name wins, matching projects.
      { targetType: 'DEBT_ACCOUNT', targetId: 'd2', name: '舊名稱' },
      'user@example.com',
    );
    await seedDebtPayment(HOUSEHOLD, 'pay-1', new Date(2026, 8, 10), 'd1', 20000);
    // Another account's repayment, and this account's repayment in another
    // month: neither may clear the zero-repayment warning.
    await seedDebtPayment(HOUSEHOLD, 'pay-2', new Date(2026, 8, 12), 'other', 15000);
    await seedDebtPayment(HOUSEHOLD, 'pay-3', new Date(2026, 7, 12), 'd2', 15000);

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.anomalies).toEqual([
      {
        targetType: 'DEBT_ACCOUNT',
        targetId: 'd2',
        name: '房貸 B',
        status: 'ZERO_ACTIVITY',
        activityCount: 0,
        activityAmount: 0,
      },
    ]);
    expect(result.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: 'd1',
          status: 'HAS_ACTIVITY',
          activityCount: 1,
          activityAmount: 20000,
        }),
      ]),
    );
  });

  it('warns about a missed repayment even when the linked liability code has activity', async () => {
    const HOUSEHOLD = householdId();
    await seedDebtAccount(HOUSEHOLD, 'd1');
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'DEBT_ACCOUNT', targetId: 'd1', name: '房貸 A' },
      'user@example.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'LEDGER_CODE', targetId: 'liability:mortgage', name: '房貸' },
      'user@example.com',
    );
    // The ADR-0048 blind spot: a new loan lands on the same ledger code, so the
    // code shows activity while the repayment is still missing.
    await seedLiabilityBorrow(HOUSEHOLD, 'borrow-1', new Date(2026, 8, 5), 500000);

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.anomalies.map((a) => a.targetId)).toEqual(['d1']);
    expect(result.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'LEDGER_CODE',
          targetId: 'liability:mortgage',
          status: 'HAS_ACTIVITY',
        }),
      ]),
    );
  });

  it('skips watched debt accounts that are inactive or outside the loan period', async () => {
    const HOUSEHOLD = householdId();
    await seedDebtAccount(HOUSEHOLD, 'd-inactive', { isActive: false });
    await seedDebtAccount(HOUSEHOLD, 'd-ended', {
      startDate: new Date(2024, 0, 15),
      endDate: new Date(2026, 7, 31),
    });
    await seedDebtAccount(HOUSEHOLD, 'd-future', {
      startDate: new Date(2026, 9, 1),
      endDate: new Date(2029, 0, 15),
    });
    for (const targetId of ['d-inactive', 'd-ended', 'd-future']) {
      await watchListRepository.addTarget(
        HOUSEHOLD,
        { targetType: 'DEBT_ACCOUNT', targetId, name: `Debt ${targetId}` },
        'user@example.com',
      );
    }

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.activities).toEqual([]);
    expect(result.anomalies).toEqual([]);
  });

  it('includes the months the loan starts and ends', async () => {
    const HOUSEHOLD = householdId();
    await seedDebtAccount(HOUSEHOLD, 'd1', {
      startDate: new Date(2026, 8, 20),
      endDate: new Date(2026, 8, 28),
    });
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'DEBT_ACCOUNT', targetId: 'd1', name: '短天期借款' },
      'user@example.com',
    );

    const result = await checkSettlementCompletenessUseCase.execute({
      householdId: HOUSEHOLD,
      year,
      month,
      auth,
    });

    expect(result.anomalies.map((a) => a.targetId)).toEqual(['d1']);
  });
});
