import { doc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthContext } from '@/application/types';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { db, resetMockDb } from '@/test/mocks/firebase';

import { importRetirementDebtUseCase } from './importRetirementDebtUseCase';

const adminAuth: AuthContext = { uid: 'admin-uid', isGlobalAdmin: false };
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

async function seedDebtAccount(
  householdId: string,
  accountId: string,
  overrides: Record<string, unknown> = {},
) {
  await setDoc(doc(db, `households/${householdId}/debtAccounts/${accountId}`), {
    ...baseFields,
    id: accountId,
    name: `Debt ${accountId}`,
    type: 'loan',
    repaymentType: 'equal_payment',
    originalAmount: 100000,
    currentBalance: 80000,
    interestRate: 5,
    startDate: new Date(2023, 0, 1),
    endDate: new Date(2028, 0, 1),
    monthlyPayment: 5000,
    linkedLedgerCode: 'liability:loan',
    isActive: true,
    ...overrides,
  });
}

async function seedDebtSnapshot(
  householdId: string,
  accountId: string,
  yearMonth: string,
  totalPaid: number,
  interestPaid: number,
) {
  await setDoc(
    doc(db, `households/${householdId}/debtAccounts/${accountId}/snapshots/${yearMonth}`),
    {
      ...baseFields,
      id: yearMonth,
      yearMonth,
      openingBalance: 80000,
      principalPaid: totalPaid - interestPaid,
      interestPaid,
      totalPaid,
      closingBalance: 80000 - (totalPaid - interestPaid),
    },
  );
}

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

describe('ImportRetirementDebtUseCase (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('imports debt-repayment expenses from active accounts with snapshot data', async () => {
    const hid = 'household-debt-happy';
    await seedHousehold(hid);
    await seedDebtAccount(hid, 'debt-1');
    await seedDebtAccount(hid, 'debt-2');

    // Seed 3 months of snapshots for each account
    const months: Array<[string, number, number]> = [
      [toYearMonth(new Date(NOW.getFullYear(), NOW.getMonth() - 2, 1)), 5000, 1000],
      [toYearMonth(new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1)), 5000, 900],
      [toYearMonth(new Date(NOW.getFullYear(), NOW.getMonth(), 1)), 5000, 800],
    ];

    for (const [ym, total, interest] of months) {
      await seedDebtSnapshot(hid, 'debt-1', ym, total, interest);
      await seedDebtSnapshot(hid, 'debt-2', ym, total, interest);
    }

    const result = await importRetirementDebtUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toHaveLength(2);

    const expense = result[0] as RetirementExpenseCategory;
    expect(expense.type).toBe('debt_payment');
    expect(expense.sourceDebtAccountId).toBeDefined();
    expect(expense.currentAnnual).toBe(60000); // monthlyPayment * 12 = 5000 * 12
    expect(expense.calculatedFrom.totalPaid).toBe(15000); // 3 * 5000
    expect(expense.calculatedFrom.interestPaid).toBe(2700); // 1000 + 900 + 800
    expect(expense.calculatedFrom.sampleCount).toBe(3);
    expect(expense.growthRate).toBe(0);
  });

  it('excludes inactive debt accounts', async () => {
    const hid = 'household-debt-inactive';
    await seedHousehold(hid);
    await seedDebtAccount(hid, 'debt-active', { isActive: true });
    await seedDebtAccount(hid, 'debt-inactive', { isActive: false });

    const ym = toYearMonth(NOW);
    await seedDebtSnapshot(hid, 'debt-active', ym, 5000, 1000);
    await seedDebtSnapshot(hid, 'debt-inactive', ym, 5000, 1000);

    const result = await importRetirementDebtUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toHaveLength(1);
    expect(result[0].sourceDebtAccountId).toBe('debt-active');
  });

  it('returns empty array when no active debt accounts exist', async () => {
    const hid = 'household-debt-empty';
    await seedHousehold(hid);

    const result = await importRetirementDebtUseCase.execute({
      householdId: hid,
      auth: adminAuth,
    });

    expect(result).toEqual([]);
  });

  it('denies access for non-members', async () => {
    const hid = 'household-debt-perm';
    await seedHousehold(hid);

    const nonMemberAuth: AuthContext = { uid: 'stranger-uid', isGlobalAdmin: false };

    await expect(
      importRetirementDebtUseCase.execute({
        householdId: hid,
        auth: nonMemberAuth,
      }),
    ).rejects.toThrow();
  });
});
