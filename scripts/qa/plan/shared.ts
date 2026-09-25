/**
 * QA plan shared vocabulary.
 *
 * Types, the deterministic clock, the fixed data window (see
 * docs/qa-seed-data.md), and the emit/audit helpers shared by every
 * builder in the qa plan. Firebase imports stay forbidden here; builders
 * are pure and the seed writer owns all I/O.
 */
import { z } from 'zod';

import type { AllocationItem } from '@/domains/allocation/schemas';
import { LEDGER_CODES } from '@/domains/ledger/constants';
import type { JournalEntryLine } from '@/domains/ledger/schemas';

export interface QaSeedIdentity {
  uid: string;
  email: string;
  householdId: string;
}

export interface SeedDoc {
  /** Collection path relative to the Firestore root. */
  collectionPath: string;
  id: string;
  data: Record<string, unknown>;
}

// Deterministic clock: identical output for identical input on every run.
export const QA_SEED_FIXED_NOW = new Date('2026-09-12T00:00:00');

// Fixed data window (docs/qa-seed-data.md §2): every transaction falls in
// 2025-01 through 2026-09, so the retirement income stream's sampleYear=2025
// is backed by real entries and all reports sit inside the window.
export const SEED_WINDOW_START = { year: 2025, month: 1 };
export const SEED_WINDOW_END = { year: 2026, month: 9 };

const SALARY_AMOUNT = 60_000;
const SAMPLE_YEAR = 2025;
export const SALARY_TOTAL_2025 = SALARY_AMOUNT * 12;

export const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

export const monthRange = (
  start: { year: number; month: number },
  end: { year: number; month: number },
) => {
  const months: { year: number; month: number }[] = [];
  let { year, month } = start;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

export const inSeedWindow = (yearMonth: string) =>
  yearMonth >= ym(SEED_WINDOW_START.year, SEED_WINDOW_START.month) &&
  yearMonth <= ym(SEED_WINDOW_END.year, SEED_WINDOW_END.month);

export interface InternalTxn {
  id: string;
  yearMonth: string;
  date: Date;
  intentType: string;
  amount?: number;
  projectId?: string | null;
  fromProjectId?: string | null;
  toProjectId?: string | null;
  entries: JournalEntryLine[];
}

export interface AllocationJournal {
  yearMonth: string;
  direction: 'INCOME' | 'EXPENSE';
  items: AllocationItem[];
}

export interface Builder {
  identity: QaSeedIdentity;
  docs: SeedDoc[];
}

export const hh = (identity: QaSeedIdentity, ...parts: string[]) =>
  ['households', identity.householdId, ...parts].join('/');

export const audit = (identity: QaSeedIdentity) => ({
  createdBy: identity.email,
  updatedBy: identity.email,
  createdAt: QA_SEED_FIXED_NOW,
  updatedAt: QA_SEED_FIXED_NOW,
});

// Shape matching BaseSchema's audit fields, for extending standalone schemas
// that don't include BaseSchema but whose stored docs do carry audit fields.
export const auditShape = {
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
};

export const emit = (
  b: Builder,
  schema: z.ZodTypeAny,
  collectionPath: string,
  id: string,
  data: object,
) => {
  const parsed = schema.parse(data); // schema drift fails the seed loudly before any write
  b.docs.push({ collectionPath, id, data: parsed as Record<string, unknown> });
};

export const entryLedgerCodes = (entries: JournalEntryLine[]) =>
  Array.from(new Set(entries.map((e) => e.ledgerCode))).sort();

export const cashDelta = (entries: JournalEntryLine[]) =>
  entries
    .filter((e) => e.ledgerCode === LEDGER_CODES.ASSET_CASH)
    .reduce((sum, e) => sum + e.debit - e.credit, 0);

export const cashThrough = (txns: InternalTxn[], target: string) =>
  txns.filter((t) => t.yearMonth <= target).reduce((sum, t) => sum + cashDelta(t.entries), 0);

export const MORTGAGE_ID = 'debt_mortgage';
export const MORTGAGE_PRINCIPAL = 8_000_000;
export const MORTGAGE_RATE = 2.4;
export const MORTGAGE_PAYMENT = 40_000;

// Brokerage market values for the months with account snapshots. Values are
// input fixtures, not derivations: gain/report math reads them as given.
const SECURITIES_MARKET_VALUE: Record<string, number> = {
  '2026-03': 20_000,
  '2026-04': 20_000,
  '2026-05': 20_000,
  '2026-06': 20_000,
  '2026-07': 20_800,
  '2026-08': 21_600,
  '2026-09': 21_200,
};

export const marketValueAt = (yearMonth: string) => SECURITIES_MARKET_VALUE[yearMonth] ?? 0;

export const securitiesSnapshotMonths = () => Object.keys(SECURITIES_MARKET_VALUE);

export const REPORT_MONTHS = ['2026-07', '2026-08', '2026-09'];

export { SALARY_AMOUNT, SAMPLE_YEAR };
