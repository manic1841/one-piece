import { serverTimestamp } from 'firebase/firestore';

/**
 * Shared audit fields for seeded documents. Values match what the app writes
 * (server timestamps + the acting user's email), so a factory-built doc is a
 * drop-in replacement for the hand-written seed objects it replaces.
 */
export const TEST_USER_EMAIL = 'user@example.com';
export const TEST_USER = { uid: 'user-1', email: TEST_USER_EMAIL, isGlobalAdmin: true };

export const auditFields = (by: string = TEST_USER_EMAIL) => ({
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: by,
  updatedBy: by,
});

/** Splits a `'YYYY-MM'` period into the numeric `year`/`month` fields snapshots carry. */
export const splitYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [year, month] = yearMonth.split('-');
  return { year: Number(year), month: Number(month) };
};
