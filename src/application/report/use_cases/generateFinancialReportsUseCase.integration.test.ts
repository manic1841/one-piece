import { collection, doc, getDocsFromServer, serverTimestamp, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { ReportType } from '@/domains/report/schemas';
import { reportRepository } from '@/infra/repositories/reportRepository';
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

describe('generateFinancialReportsUseCase — emulator integration', () => {
  let householdId: string;
  const year = 2026;
  const month = 3;
  const yearMonth = '2026-03';

  beforeEach(async () => {
    await resetMockDb();
    householdId = `household-gen-${crypto.randomUUID()}`;
  });

  it('generates, persists, and re-reads matching reports', async () => {
    // Seed settlement snapshots
    await seedAccount(householdId, 'acc-1');
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth, 5000);

    // Seed a salary income transaction in March 2026
    await seedTransaction(householdId, 'tx-1', new Date(2026, 2, 15), [
      { ledgerCode: 'asset:cash', debit: 1000, credit: 0 },
      { ledgerCode: 'income:salary', debit: 0, credit: 1000 },
    ]);

    // Generate
    const result = await generateFinancialReportsUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    // Computed data is correct
    expect(result.incomeStatement.incomeTotal).toBe(1000);
    expect(result.incomeStatement.expenseTotal).toBe(0);
    expect(result.incomeStatement.netIncome).toBe(1000);
    expect(result.balanceSheet.assets.total).toBe(5000);
    expect(result.balanceSheet.liabilities.total).toBe(0);
    expect(result.balanceSheet.equity.total).toBe(5000);
    expect(result.timestamp).toBeInstanceOf(Date);

    // Persisted: re-read via repository
    const [isReport, bsReport, cfReport] = await Promise.all([
      reportRepository.getReport(householdId, yearMonth, ReportType.INCOME_STATEMENT),
      reportRepository.getReport(householdId, yearMonth, ReportType.BALANCE_SHEET),
      reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW),
    ]);

    expect(isReport).not.toBeNull();
    expect(bsReport).not.toBeNull();
    expect(cfReport).not.toBeNull();

    // Stored data matches computed data
    expect(isReport!.data).toMatchObject({ incomeTotal: 1000, netIncome: 1000 });
    expect(bsReport!.data).toMatchObject({
      assets: { total: 5000 },
      equity: { total: 5000 },
    });

    // Exactly 3 reports in the collection
    const reportsSnapshot = await getDocsFromServer(
      collection(db, 'households', householdId, 'reports'),
    );
    expect(reportsSnapshot.docs).toHaveLength(3);
  });

  it('overwrites existing reports on regeneration', async () => {
    await seedAccount(householdId, 'acc-1');
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth, 5000);

    await generateFinancialReportsUseCase.execute({ householdId, auth, year, month });

    // Regenerate with same data
    await generateFinancialReportsUseCase.execute({ householdId, auth, year, month });

    const reportsSnapshot = await getDocsFromServer(
      collection(db, 'households', householdId, 'reports'),
    );
    expect(reportsSnapshot.docs).toHaveLength(3);
  });
});
