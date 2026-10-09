/**
 * Emulator seed writers.
 *
 * Thin `setDoc` wrappers around the pure builders in `src/test/factories/`,
 * so the collection paths live in one place instead of being repeated in
 * every emulator integration test. The builders stay write-free; this module
 * is the only place that touches Firestore.
 */
import { doc, setDoc } from 'firebase/firestore';

import {
  type AccountDoc,
  type AccountSnapshotDoc,
  type DebtAccountDoc,
  type DebtSnapshotDoc,
  type PortfolioDoc,
  type PortfolioSnapshotDoc,
  type ProjectDoc,
  type ProjectSnapshotDoc,
  type TransactionDoc,
  buildAccount,
  buildAccountSnapshot,
  buildDebtAccount,
  buildDebtSnapshot,
  buildPortfolio,
  buildPortfolioSnapshot,
  buildProject,
  buildProjectSnapshot,
  buildTransaction,
} from '@/test/factories';
import { db } from '@/test/mocks/firebase';

export const seedAccount = (
  householdId: string,
  accountId: string,
  overrides: Partial<AccountDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'accounts', accountId),
    buildAccount(accountId, overrides),
  );

export const seedAccountSnapshot = (
  householdId: string,
  accountId: string,
  yearMonth: string,
  overrides: Partial<AccountSnapshotDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'accounts', accountId, 'snapshots', yearMonth),
    buildAccountSnapshot(accountId, yearMonth, overrides),
  );

export const seedTransaction = (
  householdId: string,
  transactionId: string,
  overrides: Partial<TransactionDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'transactions', transactionId),
    buildTransaction(transactionId, overrides),
  );

export const seedProject = (
  householdId: string,
  projectId: string,
  overrides: Partial<ProjectDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'projects', projectId),
    buildProject(projectId, overrides),
  );

export const seedProjectSnapshot = (
  householdId: string,
  projectId: string,
  yearMonth: string,
  overrides: Partial<ProjectSnapshotDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'projects', projectId, 'snapshots', yearMonth),
    buildProjectSnapshot(yearMonth, overrides),
  );

export const seedPortfolio = (
  householdId: string,
  portfolioId: string,
  overrides: Partial<PortfolioDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'portfolios', portfolioId),
    buildPortfolio(portfolioId, overrides),
  );

export const seedPortfolioSnapshot = (
  householdId: string,
  portfolioId: string,
  yearMonth: string,
  overrides: Partial<PortfolioSnapshotDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', yearMonth),
    buildPortfolioSnapshot(yearMonth, overrides),
  );

export const seedDebtAccount = (
  householdId: string,
  debtAccountId: string,
  overrides: Partial<DebtAccountDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'debtAccounts', debtAccountId),
    buildDebtAccount(debtAccountId, overrides),
  );

export const seedDebtSnapshot = (
  householdId: string,
  debtAccountId: string,
  yearMonth: string,
  overrides: Partial<DebtSnapshotDoc> = {},
) =>
  setDoc(
    doc(db, 'households', householdId, 'debtAccounts', debtAccountId, 'snapshots', yearMonth),
    buildDebtSnapshot(yearMonth, overrides),
  );
