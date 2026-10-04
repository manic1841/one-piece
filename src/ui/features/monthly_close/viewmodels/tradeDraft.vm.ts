import {
  type CloseTradeInput,
  type FinancingInput,
  type SecuritiesTradeConfirmResult,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';

export type TradeSide = 'BUY' | 'SELL';

export type TradeGroupKind = 'SECURITIES' | 'FINANCING';

export type TradeBucket = 'buys' | 'sells' | 'shareholderFinancing' | 'dividendPayout';

const TRADE_BUCKETS: readonly TradeBucket[] = [
  'buys',
  'sells',
  'shareholderFinancing',
  'dividendPayout',
];

export interface TradeRowValue {
  transactionId?: string;
  amount: number;
  date: Date;
  description?: string;
  projectId: string | null;
  /** Set on add/edit; only dirty rows are submitted so untouched prefills are not rewritten. */
  dirty?: boolean;
}

export interface SecuritiesTradeDraft {
  securities: { buys: TradeRowValue[]; sells: TradeRowValue[] };
  financing: { shareholderFinancing: TradeRowValue[]; dividendPayout: TradeRowValue[] };
  removedTransactionIds: string[];
}

export const EMPTY_TRADE_DRAFT: SecuritiesTradeDraft = {
  securities: { buys: [], sells: [] },
  financing: { shareholderFinancing: [], dividendPayout: [] },
  removedTransactionIds: [],
};

export interface TradeDrawerDraft {
  side: TradeSide;
  amount: number;
  description?: string;
  projectId: string | null;
}

export interface TradeTableRow {
  rowKey: string;
  transactionId?: string;
  side: TradeSide;
  amount: number;
  description?: string;
  projectId?: string | null;
  date: Date;
}

export type TradeCommand =
  | { type: 'ADD'; bucket: TradeBucket; row: TradeRowValue }
  | { type: 'REPLACE'; rowKey: string; toBucket: TradeBucket; row: TradeRowValue }
  | { type: 'DELETE'; rowKey: string };

export const sideForBucket = (bucket: TradeBucket): TradeSide =>
  bucket === 'buys' || bucket === 'shareholderFinancing' ? 'BUY' : 'SELL';

/** Financing's BUY/SELL sides are 股東融資／發放分紅, not buy/sell. */
export const resolveTradeBucket = (kind: TradeGroupKind, side: TradeSide): TradeBucket => {
  if (kind === 'SECURITIES') return side === 'BUY' ? 'buys' : 'sells';
  return side === 'BUY' ? 'shareholderFinancing' : 'dividendPayout';
};

/** Stable identity: the transaction ID when persisted, else a bucket-scoped position. */
export const tradeRowKey = (
  bucket: TradeBucket,
  row: { transactionId?: string },
  index: number,
): string => row.transactionId ?? `${bucket}:${index}`;

const rowsOf = (draft: SecuritiesTradeDraft, bucket: TradeBucket): TradeRowValue[] =>
  bucket === 'buys' || bucket === 'sells' ? draft.securities[bucket] : draft.financing[bucket];

const withRows = (
  draft: SecuritiesTradeDraft,
  bucket: TradeBucket,
  rows: TradeRowValue[],
): SecuritiesTradeDraft => {
  if (bucket === 'buys' || bucket === 'sells') {
    return { ...draft, securities: { ...draft.securities, [bucket]: rows } };
  }
  return { ...draft, financing: { ...draft.financing, [bucket]: rows } };
};

const locateTradeRow = (
  draft: SecuritiesTradeDraft,
  rowKey: string,
): { bucket: TradeBucket; index: number } | null => {
  for (const bucket of TRADE_BUCKETS) {
    const index = rowsOf(draft, bucket).findIndex(
      (row, position) => tradeRowKey(bucket, row, position) === rowKey,
    );
    if (index !== -1) return { bucket, index };
  }
  return null;
};

export const findTradeRow = (
  draft: SecuritiesTradeDraft,
  rowKey: string | null,
): { side: TradeSide; row: TradeRowValue } | null => {
  if (rowKey === null) return null;
  const found = locateTradeRow(draft, rowKey);
  if (!found) return null;
  return { side: sideForBucket(found.bucket), row: rowsOf(draft, found.bucket)[found.index] };
};

export const projectTradeRows = (bucket: TradeBucket, rows: TradeRowValue[]): TradeTableRow[] =>
  rows.map((row, index) => ({
    rowKey: tradeRowKey(bucket, row, index),
    transactionId: row.transactionId,
    side: sideForBucket(bucket),
    amount: row.amount,
    description: row.description,
    projectId: row.projectId,
    date: row.date,
  }));

export const toTradeRowValue = (transaction: {
  id: string;
  amount?: number | null;
  date: Date;
  description?: string | null;
  projectId?: string | null;
}): TradeRowValue => ({
  transactionId: transaction.id,
  amount: transaction.amount ?? 0,
  date: transaction.date,
  description: transaction.description ?? undefined,
  projectId: transaction.projectId ?? null,
});

// A row back in the draft is no longer removable.
const clearRemoval = (
  draft: SecuritiesTradeDraft,
  transactionId?: string,
): SecuritiesTradeDraft => {
  if (transactionId === undefined || !draft.removedTransactionIds.includes(transactionId)) {
    return draft;
  }
  return {
    ...draft,
    removedTransactionIds: draft.removedTransactionIds.filter((id) => id !== transactionId),
  };
};

export const applyTradeCommand = (
  draft: SecuritiesTradeDraft,
  command: TradeCommand,
): SecuritiesTradeDraft => {
  if (command.type === 'ADD') {
    const rows = [...rowsOf(draft, command.bucket), { ...command.row, dirty: true }];
    return clearRemoval(withRows(draft, command.bucket, rows), command.row.transactionId);
  }

  const found = locateTradeRow(draft, command.rowKey);
  if (!found) return draft;

  if (command.type === 'DELETE') {
    const rows = rowsOf(draft, found.bucket);
    const removed = rows[found.index];
    const next = withRows(
      draft,
      found.bucket,
      rows.filter((_, index) => index !== found.index),
    );
    if (removed.transactionId === undefined) return next;
    if (next.removedTransactionIds.includes(removed.transactionId)) return next;
    return {
      ...next,
      removedTransactionIds: [...next.removedTransactionIds, removed.transactionId],
    };
  }

  // REPLACE: drop the old occurrence, then re-insert at its position in the target bucket.
  const without = withRows(
    draft,
    found.bucket,
    rowsOf(draft, found.bucket).filter((_, index) => index !== found.index),
  );
  const target = rowsOf(without, command.toBucket);
  const insertAt = Math.min(found.index, target.length);
  const edited = { ...command.row, dirty: true };
  const next = [...target.slice(0, insertAt), edited, ...target.slice(insertAt)];
  return clearRemoval(withRows(without, command.toBucket, next), command.row.transactionId);
};

const normalizeRow = (row: CloseTradeInput): TradeRowValue => ({
  transactionId: row.transactionId,
  amount: row.amount,
  date: row.date,
  description: row.description,
  projectId: row.projectId ?? null,
});

/** The reverse of `normalizeRow`: the request shape, without the draft-only `dirty` flag. */
const toSubmitRow = (row: TradeRowValue): CloseTradeInput => ({
  transactionId: row.transactionId,
  amount: row.amount,
  date: row.date,
  description: row.description,
  projectId: row.projectId,
});

const dirtyRowsOf = (rows: TradeRowValue[]): CloseTradeInput[] =>
  rows.filter((row) => row.dirty === true).map(toSubmitRow);

/**
 * The rows to submit: only rows the user added or edited, plus the removal
 * ledger. Untouched prefilled rows stay out of the write so their audit fields
 * (updatedAt/updatedBy) are not churned.
 */
export const pendingTradeRows = (
  draft: SecuritiesTradeDraft,
): {
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  financing: { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };
} => ({
  securities: {
    buys: dirtyRowsOf(draft.securities.buys),
    sells: dirtyRowsOf(draft.securities.sells),
  },
  financing: {
    shareholderFinancing: dirtyRowsOf(draft.financing.shareholderFinancing),
    dividendPayout: dirtyRowsOf(draft.financing.dividendPayout),
  },
});

/** Reconcile one bucket after a confirm: replace edited rows in place, append new/moved rows. */
const adoptBucket = (rows: TradeRowValue[], confirmed: CloseTradeInput[]): TradeRowValue[] => {
  const confirmedById = new Map(
    confirmed
      .filter((row) => row.transactionId !== undefined)
      .map((row) => [row.transactionId as string, row]),
  );
  const placed = new Set<string>();
  const next: TradeRowValue[] = [];
  for (const row of rows) {
    const id = row.transactionId;
    if (id !== undefined && confirmedById.has(id)) {
      next.push(normalizeRow(confirmedById.get(id)!));
      placed.add(id);
      continue;
    }
    // Drop rows the write consumed: an added row (no id) or one moved to another bucket.
    if (row.dirty === true) continue;
    next.push(row);
  }
  for (const row of confirmed) {
    if (row.transactionId !== undefined && placed.has(row.transactionId)) continue;
    next.push(normalizeRow(row));
  }
  return next;
};

/**
 * Adopt the write's authoritative rows (#250) without discarding untouched
 * prefills: edited rows are replaced in place, new and cross-bucket rows appended.
 */
export const adoptConfirmedTradeRows = (
  draft: SecuritiesTradeDraft,
  confirmed: SecuritiesTradeConfirmResult | null | undefined,
): SecuritiesTradeDraft => {
  if (!confirmed) return draft;
  return {
    securities: {
      buys: adoptBucket(draft.securities.buys, confirmed.buys),
      sells: adoptBucket(draft.securities.sells, confirmed.sells),
    },
    financing: {
      shareholderFinancing: adoptBucket(
        draft.financing.shareholderFinancing,
        confirmed.shareholderFinancing,
      ),
      dividendPayout: adoptBucket(draft.financing.dividendPayout, confirmed.dividendPayout),
    },
    removedTransactionIds: [],
  };
};
