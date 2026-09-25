import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { db, resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: true };

const seedAccount = async (householdId: string, accountId: string) => {
  await setDoc(doc(db, 'households', householdId, 'accounts', accountId), {
    id: accountId,
    name: `Account ${accountId}`,
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedAccountSnapshot = async (
  householdId: string,
  accountId: string,
  yearMonth: string,
  amount: number,
) => {
  await setDoc(doc(db, 'households', householdId, 'accounts', accountId, 'snapshots', yearMonth), {
    id: yearMonth,
    accountId,
    year: Number(yearMonth.split('-')[0]),
    month: Number(yearMonth.split('-')[1]),
    amount,
    holdings: [],
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
  entries: { ledgerCode: string; debit: number; credit: number }[],
) => {
  await setDoc(doc(db, 'households', householdId, 'transactions', transactionId), {
    id: transactionId,
    date,
    description: '',
    intent: 'SALARY',
    intentType: 'INCOME',
    amount: 0,
    projectId: null,
    allocationId: null,
    entries,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

describe('previewFinancialReportsWorkflow — emulator integration', () => {
  let householdId: string;
  const year = 2026;
  const month = 3;
  const yearMonth = '2026-03';

  beforeEach(async () => {
    await resetMockDb();
    householdId = `household-prev-${crypto.randomUUID()}`;
  });

  it('computes all three reports from seeded data', async () => {
    await seedAccount(householdId, 'acc-1');
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth, 5000);

    await seedTransaction(householdId, 'tx-1', new Date(2026, 2, 15), [
      { ledgerCode: 'asset:cash', debit: 1000, credit: 0 },
      { ledgerCode: 'income:salary', debit: 0, credit: 1000 },
    ]);

    const result = await previewFinancialReportsWorkflow.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.incomeStatement.incomeTotal).toBe(1000);
    expect(result.incomeStatement.expenseTotal).toBe(0);
    expect(result.incomeStatement.netIncome).toBe(1000);

    expect(result.balanceSheet.assets.total).toBe(5000);
    expect(result.balanceSheet.liabilities.total).toBe(0);
    expect(result.balanceSheet.equity.total).toBe(5000);

    expect(result.cashFlow.yearMonth).toBe(yearMonth);
    expect(result.cashFlow.actualBalance).toBe(5000);

    expect(result.isPersisted).toBe(false);
    expect(result.timestamps).toEqual({});
  });

  it('returns empty reports when no data seeded', async () => {
    const result = await previewFinancialReportsWorkflow.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.incomeStatement.incomeTotal).toBe(0);
    expect(result.incomeStatement.expenseTotal).toBe(0);
    expect(result.balanceSheet.assets.total).toBe(0);
    expect(result.cashFlow.actualBalance).toBe(0);
    expect(result.isPersisted).toBe(false);
  });

  it('denies read permission for non-member', async () => {
    await expect(
      previewFinancialReportsWorkflow.execute({
        householdId,
        auth: { uid: 'stranger', email: 'x@x.com', isGlobalAdmin: false },
        year,
        month,
      }),
    ).rejects.toThrow();
  });
});
