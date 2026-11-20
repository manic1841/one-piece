import { beforeEach, describe, expect, it } from 'vitest';

import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { TEST_USER as auth } from '@/test/factories';
import { resetMockDb } from '@/test/mocks/firebase';
import { seedAccount, seedAccountSnapshot, seedTransaction } from '@/test/seeds';

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
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth, { amount: 5000 });

    await seedTransaction(householdId, 'tx-1', {
      date: new Date(2026, 2, 15),
      entries: [
        { ledgerCode: 'asset:cash', debit: 1000, credit: 0 },
        { ledgerCode: 'income:salary', debit: 0, credit: 1000 },
      ],
    });

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

  it('re-previews as persisted with timestamps after the workflow generates reports', async () => {
    await seedAccount(householdId, 'acc-1');
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth, { amount: 5000 });

    const before = await previewFinancialReportsWorkflow.execute({
      householdId,
      auth,
      year,
      month,
    });
    expect(before.isPersisted).toBe(false);

    await generateFinancialReportsUseCase.execute({ householdId, auth, year, month });

    const after = await previewFinancialReportsWorkflow.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(after.isPersisted).toBe(true);
    expect(after.timestamps.incomeStatement).toBeTruthy();
    expect(after.timestamps.balanceSheet).toBeTruthy();
    expect(after.timestamps.cashFlow).toBeTruthy();
    expect(after.incomeStatement.incomeTotal).toBe(before.incomeStatement.incomeTotal);
    expect(after.balanceSheet.assets.total).toBe(before.balanceSheet.assets.total);
  });
});
