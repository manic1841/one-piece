import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const seedDebtAccount = async (
  targetHouseholdId: string,
  debtAccountId: string,
  linkedLedgerCode: string,
) => {
  await setDoc(doc(db, 'households', targetHouseholdId, 'debtAccounts', debtAccountId), {
    id: debtAccountId,
    name: `貸款 ${debtAccountId}`,
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 1000000,
    currentBalance: 900000,
    interestRate: 2.1,
    startDate: serverTimestamp(),
    endDate: serverTimestamp(),
    graceEndDate: null,
    monthlyPayment: 35000,
    linkedLedgerCode,
    linkedProjectId: null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedPaymentTransaction = async (
  targetHouseholdId: string,
  transactionId: string,
  data: Record<string, unknown>,
) => {
  await setDoc(doc(db, 'households', targetHouseholdId, 'transactions', transactionId), {
    id: transactionId,
    date: new Date('2026-05-15'),
    description: '還款',
    intentType: 'DEBT_PAYMENT',
    amount: 35000,
    projectId: null,
    debtAccountId: 'debt-a',
    allocationId: null,
    ledgerCodes: ['asset:cash', 'liability:mortgage'],
    entries: [
      { ledgerCode: 'liability:mortgage', debit: 30000, credit: 0 },
      { ledgerCode: 'expense:interest', debit: 5000, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: 35000 },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
    ...data,
  });
};

describe('debt account smart-delete detection with Firestore Emulator', () => {
  let currentHouseholdId: string;

  beforeEach(async () => {
    await resetMockDb();
    currentHouseholdId = `household-smart-delete-${crypto.randomUUID()}`;
  });

  it('detects canonical DEBT_PAYMENT history by debtAccountId, independent of linkedLedgerCode', async () => {
    await seedDebtAccount(currentHouseholdId, 'debt-a', 'liability:mortgage');
    await seedPaymentTransaction(currentHouseholdId, 'tx-payment', { debtAccountId: 'debt-a' });

    expect(await debtAccountRepository.checkHasPayments(currentHouseholdId, 'debt-a')).toBe(true);
    expect(await debtAccountRepository.checkHasPayments(currentHouseholdId, 'debt-b')).toBe(false);
  });

  it('keeps the legacy LIABILITY_PAYMENT ledger-code fallback', async () => {
    await seedDebtAccount(currentHouseholdId, 'debt-a', 'liability:mortgage');
    await seedPaymentTransaction(currentHouseholdId, 'tx-legacy', {
      intentType: 'LIABILITY_PAYMENT',
      debtAccountId: null,
    });

    expect(await debtAccountRepository.checkHasPayments(currentHouseholdId, 'debt-a')).toBe(true);
  });

  it('blocks hard delete when snapshots exist without payment transactions', async () => {
    await seedDebtAccount(currentHouseholdId, 'debt-a', 'liability:mortgage');
    await setDoc(
      doc(db, 'households', currentHouseholdId, 'debtAccounts', 'debt-a', 'snapshots', '2026-05'),
      {
        id: '2026-05',
        yearMonth: '2026-05',
        openingBalance: 1000000,
        principalPaid: 30000,
        interestPaid: 5000,
        totalPaid: 35000,
        closingBalance: 970000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'user@example.com',
        updatedBy: 'user@example.com',
      },
    );

    expect(await debtSnapshotRepository.hasSnapshots(currentHouseholdId, 'debt-a')).toBe(true);
    expect(await debtSnapshotRepository.hasSnapshots(currentHouseholdId, 'debt-b')).toBe(false);
  });

  it('reports no history for a fresh account with sibling payments on a shared ledger code', async () => {
    await seedDebtAccount(currentHouseholdId, 'debt-a', 'liability:mortgage');
    await seedDebtAccount(currentHouseholdId, 'debt-b', 'liability:mortgage');
    await seedPaymentTransaction(currentHouseholdId, 'tx-payment-b', { debtAccountId: 'debt-b' });

    expect(await debtAccountRepository.checkHasPayments(currentHouseholdId, 'debt-b')).toBe(true);
    expect(await debtAccountRepository.checkHasPayments(currentHouseholdId, 'debt-a')).toBe(false);
  });
});
