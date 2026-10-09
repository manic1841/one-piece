/**
 * Firestore document factories for emulator integration tests.
 *
 * Builders return plain, valid-by-default document data and accept `Partial`
 * overrides. They perform no Firestore writes — the caller decides the path
 * and calls `setDoc`. Cross-file duplicated seed objects live here so the same
 * shape has one home (see docs/testing.md §Fixture factory).
 */
export { TEST_USER, TEST_USER_EMAIL, auditFields, splitYearMonth } from './audit';
export {
  type AccountDoc,
  type AccountSnapshotDoc,
  buildAccount,
  buildAccountSnapshot,
} from './account';
export {
  type ProjectDoc,
  type ProjectSnapshotDoc,
  buildProject,
  buildProjectSnapshot,
} from './project';
export {
  type PortfolioDoc,
  type PortfolioPerformance,
  type PortfolioSnapshotDoc,
  buildPortfolio,
  buildPortfolioSnapshot,
} from './portfolio';
export {
  type DebtAccountDoc,
  type DebtSnapshotDoc,
  buildDebtAccount,
  buildDebtSnapshot,
} from './debt';
export { type EntryDoc, type TransactionDoc, buildTransaction } from './transaction';
