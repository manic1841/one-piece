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

/** Cumulative cash delta for one physical account through `target` (issue #198
 * Q1): snapshots derive from the asset:cash entries tagged with the account
 * id — the same data a re-seed from Firestore would read. */
export const cashThroughFor = (txns: InternalTxn[], accountId: string, target: string) =>
  txns
    .filter((t) => t.yearMonth <= target)
    .reduce(
      (sum, t) =>
        sum +
        t.entries
          .filter((e) => e.ledgerCode === LEDGER_CODES.ASSET_CASH && e.accountId === accountId)
          .reduce((s, e) => s + e.debit - e.credit, 0),
      0,
    );

/** Every account id the journal's asset:cash entries tag, so per-account
 * tagging can be asserted on the whole journal. */
export const cashAccountIds = (txns: InternalTxn[]) =>
  Array.from(
    new Set(
      txns.flatMap((t) =>
        t.entries
          .filter((e) => e.ledgerCode === LEDGER_CODES.ASSET_CASH && e.accountId)
          .map((e) => e.accountId as string),
      ),
    ),
  );

export const MORTGAGE_ID = 'debt_mortgage';
export const MORTGAGE_PRINCIPAL = 8_000_000;
export const MORTGAGE_RATE = 2.4;
export const MORTGAGE_PAYMENT = 40_000;

// Car loan: drawdown + vehicle purchase in April, monthly payments from May.
export const CAR_LOAN_ID = 'debt_car_loan';
export const CAR_LOAN_PRINCIPAL = 450_000;
export const CAR_LOAN_RATE = 4.2;
export const CAR_LOAN_PAYMENT = 13_000;
export const CAR_PURCHASE_AMOUNT = 450_000;

// Account ids (docs/qa-seed-data.md §2). Only acc_cash / acc_securities
// predate the multi-account story; the rest are Q1/Q3 additions.
export const ACC_CASH = 'acc_cash';
export const ACC_SECURITIES = 'acc_securities';
export const ACC_BANK_MAIN = 'acc_bank_main';
export const ACC_BANK_SAVINGS = 'acc_bank_savings';
export const ACC_BANK_FOREIGN = 'acc_bank_foreign';
export const ACCOUNT_IDS = [
  ACC_CASH,
  ACC_BANK_MAIN,
  ACC_BANK_SAVINGS,
  ACC_BANK_FOREIGN,
  ACC_SECURITIES,
] as const;

// Brokerage market values for the months with account snapshots. Values are
// input fixtures, not derivations: gain/report math reads them as given.
const SECURITIES_MARKET_VALUE: Record<string, number> = {
  '2026-01': 17_500,
  '2026-02': 17_800,
  '2026-03': 37_800,
  '2026-04': 38_500,
  '2026-05': 47_300,
  '2026-06': 58_700,
  '2026-07': 61_100,
  '2026-08': 62_800,
  '2026-09': 61_500,
};

export const marketValueAt = (yearMonth: string) => SECURITIES_MARKET_VALUE[yearMonth] ?? 0;

export const securitiesSnapshotMonths = () => Object.keys(SECURITIES_MARKET_VALUE);

// Brokerage holdings per month (issue #198 Q4). Each month's per-symbol
// market values sum to the account snapshot amount; leverage feeds the
// exposure stat (1 = unleveraged ETF, 2 = leveraged ETF). The first 0050 lot
// is the 2025-12 opening position; later lots mirror the seeded purchases.
export const HOLDINGS_BY_MONTH: Record<
  string,
  { symbol: string; name: string; cost: number; marketValue: number; leverage: number }[]
> = {
  '2026-01': [{ symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 17_500, leverage: 1 }],
  '2026-02': [{ symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 17_800, leverage: 1 }],
  '2026-03': [{ symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 37_800, leverage: 1 }],
  '2026-04': [{ symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 38_500, leverage: 1 }],
  '2026-05': [
    { symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 39_200, leverage: 1 },
    {
      symbol: '00675L',
      name: '群益台灣精選高息槓桿',
      cost: 8_000,
      marketValue: 8_100,
      leverage: 2,
    },
  ],
  '2026-06': [
    { symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 40_000, leverage: 1 },
    {
      symbol: '00675L',
      name: '群益台灣精選高息槓桿',
      cost: 8_000,
      marketValue: 8_500,
      leverage: 2,
    },
    { symbol: '00878', name: '國泰永續高股息', cost: 10_000, marketValue: 10_200, leverage: 1 },
  ],
  '2026-07': [
    { symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 41_500, leverage: 1 },
    {
      symbol: '00675L',
      name: '群益台灣精選高息槓桿',
      cost: 8_000,
      marketValue: 9_200,
      leverage: 2,
    },
    { symbol: '00878', name: '國泰永續高股息', cost: 10_000, marketValue: 10_400, leverage: 1 },
  ],
  '2026-08': [
    { symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 42_600, leverage: 1 },
    {
      symbol: '00675L',
      name: '群益台灣精選高息槓桿',
      cost: 8_000,
      marketValue: 9_700,
      leverage: 2,
    },
    { symbol: '00878', name: '國泰永續高股息', cost: 10_000, marketValue: 10_500, leverage: 1 },
  ],
  '2026-09': [
    { symbol: '0050', name: '元大台灣50', cost: 50, marketValue: 41_800, leverage: 1 },
    {
      symbol: '00675L',
      name: '群益台灣精選高息槓桿',
      cost: 8_000,
      marketValue: 9_400,
      leverage: 2,
    },
    { symbol: '00878', name: '國泰永續高股息', cost: 10_000, marketValue: 10_300, leverage: 1 },
  ],
};

export const holdingsAt = (yearMonth: string) => HOLDINGS_BY_MONTH[yearMonth] ?? [];

// Foreign-currency story: a single USD remittance frozen at 31.2 (issue #198
// Q3/Q8). amount = originalAmount × exchangeRate keeps the snapshot exactly
// reconciled with the journal; no monthly FX rebalancing events exist.
export const FOREIGN_CURRENCY = 'USD';
export const USD_EXCHANGE_RATE = 31.2;
export const USD_REMITTANCE_AMOUNT = 1_800;
export const usdTwdAmount = () => USD_REMITTANCE_AMOUNT * USD_EXCHANGE_RATE;

// Portfolio performance base: the 2026-01 opening position, not the old
// March 20,000 entry (issue #198 Q4).
export const PORTFOLIO_BASE_VALUE = 17_500;

export const REPORT_MONTHS = ['2026-07', '2026-08', '2026-09'];

export { SALARY_AMOUNT, SAMPLE_YEAR };
