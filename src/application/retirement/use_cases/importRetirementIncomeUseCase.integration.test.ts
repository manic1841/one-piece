import { doc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthContext } from '@/application/types';
import { db, resetMockDb } from '@/test/mocks/firebase';

import { importRetirementIncomeUseCase } from './importRetirementIncomeUseCase';

const adminAuth: AuthContext = { uid: 'admin-uid', isGlobalAdmin: false };
const CURRENT_YEAR = new Date().getFullYear();
const LAST_FULL_YEAR = CURRENT_YEAR - 1;

const NOW = new Date();

const baseFields = {
  createdBy: 'admin-uid',
  createdAt: NOW,
  updatedBy: 'admin-uid',
  updatedAt: NOW,
};

function householdDoc(householdId: string) {
  return doc(db, `households/${householdId}`);
}

async function seedHousehold(householdId: string) {
  await setDoc(householdDoc(householdId), {
    id: householdId,
    name: `Household ${householdId}`,
    members: { 'admin-uid': { role: 'admin', joinedAt: NOW } },
    ...baseFields,
  });
}

async function seedTransaction(
  householdId: string,
  txId: string,
  date: Date,
  entries: Array<{ ledgerCode: string; debit: number; credit: number }>,
) {
  await setDoc(
    doc(db, `households/${householdId}/transactions/${txId}`),
    {
      ...baseFields,
      id: txId,
      date,
      description: `Transaction ${txId}`,
      entries: entries.map((e) => ({
        ledgerCode: e.ledgerCode,
        debit: e.debit,
        credit: e.credit,
      })),
      ledgerCodes: entries.map((e) => e.ledgerCode),
      createdBy: 'admin-uid',
    },
  );
}

describe('ImportRetirementIncomeUseCase (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('imports income from prior-year transactions grouped by ledger code', async () => {
    const hid = 'household-income-happy';
    await seedHousehold(hid);

    // Seed 3 transactions in last full year: 2 income:salary + 1 expense:rent
    const jan = new Date(LAST_FULL_YEAR, 0, 15);
    const jun = new Date(LAST_FULL_YEAR, 5, 10);
    const mar = new Date(LAST_FULL_YEAR, 2, 20);

    await seedTransaction(hid, 'tx-1', jan, [
      { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
    ]);
    await seedTransaction(hid, 'tx-2', jun, [
      { ledgerCode: 'income:salary', debit: 0, credit: 60000 },
    ]);
    await seedTransaction(hid, 'tx-3', mar, [
      { ledgerCode: 'expense:rent', debit: 20000, credit: 0 },
    ]);

    const result = await importRetirementIncomeUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toHaveLength(1);

    const source = result[0];
    expect(source.incomeCategory).toBe('income:salary');
    expect(source.calculatedFrom.sampleYear).toBe(LAST_FULL_YEAR);
    expect(source.calculatedFrom.totalAmount).toBe(110000);
    expect(source.calculatedFrom.sampleCount).toBe(2);
    expect(source.calculatedFrom.monthlyAverage).toBeCloseTo(110000 / 12);
    expect(source.baseAmount).toBe(110000);
    expect(source.incomeCalculationMode).toBe('IMPORTED');
  });

  it('returns empty array when no income entries exist', async () => {
    const hid = 'household-income-empty';
    await seedHousehold(hid);

    await seedTransaction(hid, 'tx-1', new Date(LAST_FULL_YEAR, 0, 15), [
      { ledgerCode: 'expense:rent', debit: 20000, credit: 0 },
    ]);

    const result = await importRetirementIncomeUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toEqual([]);
  });

  it('denies access for non-members', async () => {
    const hid = 'household-income-perm';
    await seedHousehold(hid);

    const nonMemberAuth: AuthContext = { uid: 'stranger-uid', isGlobalAdmin: false };

    await expect(
      importRetirementIncomeUseCase.execute({
        householdId: hid,
        auth: nonMemberAuth,
      }),
    ).rejects.toThrow();
  });

  it('only queries transactions from the last full calendar year', async () => {
    const hid = 'household-income-window';
    await seedHousehold(hid);

    // Transaction from current year (should be excluded — current year is not "last full year")
    await seedTransaction(hid, 'tx-current', new Date(CURRENT_YEAR, 0, 15), [
      { ledgerCode: 'income:salary', debit: 0, credit: 99999 },
    ]);

    // Transaction from two years ago (should be excluded)
    await seedTransaction(hid, 'tx-old', new Date(LAST_FULL_YEAR - 1, 0, 15), [
      { ledgerCode: 'income:salary', debit: 0, credit: 88888 },
    ]);

    const result = await importRetirementIncomeUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toEqual([]);
  });

  it('groups multiple ledger codes into separate income sources', async () => {
    const hid = 'household-income-multi';
    await seedHousehold(hid);

    await seedTransaction(hid, 'tx-1', new Date(LAST_FULL_YEAR, 0, 15), [
      { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
    ]);
    await seedTransaction(hid, 'tx-2', new Date(LAST_FULL_YEAR, 1, 20), [
      { ledgerCode: 'income:dividend', debit: 0, credit: 5000 },
    ]);

    const result = await importRetirementIncomeUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toHaveLength(2);
    const codes = result.map((s) => s.incomeCategory).sort();
    expect(codes).toEqual(['income:dividend', 'income:salary']);
  });
});
