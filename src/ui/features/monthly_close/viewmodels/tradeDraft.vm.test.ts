import { describe, expect, it } from 'vitest';

import { type SecuritiesTradeConfirmResult } from '@/application/monthly_close/use_cases/monthlyCloseRequests';

import {
  EMPTY_TRADE_DRAFT,
  type SecuritiesTradeDraft,
  type TradeRowValue,
  adoptConfirmedTradeRows,
  applyTradeCommand,
  findTradeRow,
  pendingTradeRows,
  projectTradeRows,
  resolveTradeBucket,
  sideForBucket,
  toTradeRowValue,
  tradeRowKey,
} from './tradeDraft.vm';

const row = (amount: number, transactionId?: string): TradeRowValue => ({
  transactionId,
  amount,
  date: new Date('2026-08-05'),
  projectId: null,
});

const draftWith = (overrides: Partial<SecuritiesTradeDraft>): SecuritiesTradeDraft => ({
  ...EMPTY_TRADE_DRAFT,
  ...overrides,
});

describe('tradeRowKey', () => {
  it('uses the transaction ID when the row is persisted', () => {
    expect(tradeRowKey('buys', { transactionId: 'tx-1' }, 3)).toBe('tx-1');
  });

  it('falls back to a bucket-scoped position for unsaved rows', () => {
    expect(tradeRowKey('buys', {}, 0)).toBe('buys:0');
    expect(tradeRowKey('shareholderFinancing', {}, 2)).toBe('shareholderFinancing:2');
  });
});

describe('side mapping', () => {
  it('maps each table side to its bucket and back', () => {
    expect(resolveTradeBucket('SECURITIES', 'BUY')).toBe('buys');
    expect(resolveTradeBucket('SECURITIES', 'SELL')).toBe('sells');
    expect(resolveTradeBucket('FINANCING', 'BUY')).toBe('shareholderFinancing');
    expect(resolveTradeBucket('FINANCING', 'SELL')).toBe('dividendPayout');
    expect(sideForBucket('buys')).toBe('BUY');
    expect(sideForBucket('dividendPayout')).toBe('SELL');
  });
});

describe('projectTradeRows', () => {
  it('stamps each row with its identity and side', () => {
    const rows = projectTradeRows('buys', [row(100, 'tx-1'), row(200)]);
    expect(rows.map((r) => r.rowKey)).toEqual(['tx-1', 'buys:1']);
    expect(rows.every((r) => r.side === 'BUY')).toBe(true);
  });
});

describe('findTradeRow', () => {
  it('locates a persisted row across buckets', () => {
    const draft = draftWith({
      financing: { shareholderFinancing: [row(50, 'tx-fin')], dividendPayout: [] },
    });
    expect(findTradeRow(draft, 'tx-fin')).toEqual({
      side: 'BUY',
      row: expect.objectContaining({ transactionId: 'tx-fin' }),
    });
  });

  it('locates an unsaved row by its positional key', () => {
    const draft = draftWith({ securities: { buys: [row(10)], sells: [] } });
    expect(findTradeRow(draft, 'buys:0')?.row.amount).toBe(10);
  });

  it('returns null for a null key or an unknown key', () => {
    expect(findTradeRow(EMPTY_TRADE_DRAFT, null)).toBeNull();
    expect(findTradeRow(EMPTY_TRADE_DRAFT, 'buys:9')).toBeNull();
  });
});

describe('applyTradeCommand — ADD', () => {
  it('appends to the target bucket', () => {
    const next = applyTradeCommand(EMPTY_TRADE_DRAFT, {
      type: 'ADD',
      bucket: 'buys',
      row: row(100),
    });
    expect(next.securities.buys).toHaveLength(1);
  });

  it('clears a removal when the same transaction ID is added back', () => {
    const draft = draftWith({ removedTransactionIds: ['tx-1'] });
    const next = applyTradeCommand(draft, { type: 'ADD', bucket: 'buys', row: row(100, 'tx-1') });
    expect(next.removedTransactionIds).toEqual([]);
  });
});

describe('applyTradeCommand — REPLACE', () => {
  it('edits an unsaved row in place without duplicating it', () => {
    const draft = draftWith({ securities: { buys: [row(10), row(20)], sells: [] } });
    const next = applyTradeCommand(draft, {
      type: 'REPLACE',
      rowKey: 'buys:0',
      toBucket: 'buys',
      row: row(99),
    });
    expect(next.securities.buys).toHaveLength(2);
    expect(next.securities.buys[0]?.amount).toBe(99);
    expect(next.securities.buys[1]?.amount).toBe(20);
  });

  it('moves a row across buckets when the side changed', () => {
    const draft = draftWith({ securities: { buys: [row(10, 'tx-1')], sells: [] } });
    const next = applyTradeCommand(draft, {
      type: 'REPLACE',
      rowKey: 'tx-1',
      toBucket: 'sells',
      row: row(10, 'tx-1'),
    });
    expect(next.securities.buys).toHaveLength(0);
    expect(next.securities.sells).toHaveLength(1);
  });

  it('leaves the draft untouched when the key matches nothing', () => {
    const next = applyTradeCommand(EMPTY_TRADE_DRAFT, {
      type: 'REPLACE',
      rowKey: 'buys:9',
      toBucket: 'buys',
      row: row(10),
    });
    expect(next).toBe(EMPTY_TRADE_DRAFT);
  });
});

describe('applyTradeCommand — DELETE', () => {
  it('removes a persisted row and records its ID for the write', () => {
    const draft = draftWith({ securities: { buys: [row(10, 'tx-1')], sells: [] } });
    const next = applyTradeCommand(draft, { type: 'DELETE', rowKey: 'tx-1' });
    expect(next.securities.buys).toHaveLength(0);
    expect(next.removedTransactionIds).toEqual(['tx-1']);
  });

  it('removes an unsaved row without touching the removal ledger', () => {
    const draft = draftWith({ securities: { buys: [row(10)], sells: [] } });
    const next = applyTradeCommand(draft, { type: 'DELETE', rowKey: 'buys:0' });
    expect(next.securities.buys).toHaveLength(0);
    expect(next.removedTransactionIds).toEqual([]);
  });

  it('does not record the same ID twice', () => {
    const draft = draftWith({
      securities: { buys: [row(10, 'tx-1')], sells: [] },
      removedTransactionIds: ['tx-1'],
    });
    const next = applyTradeCommand(draft, { type: 'DELETE', rowKey: 'tx-1' });
    expect(next.removedTransactionIds).toEqual(['tx-1']);
  });
});

describe('toTradeRowValue', () => {
  it('carries the document ID and defaults a missing amount to zero', () => {
    expect(toTradeRowValue({ id: 'tx-1', amount: null, date: new Date('2026-08-05') })).toEqual(
      expect.objectContaining({ transactionId: 'tx-1', amount: 0, projectId: null }),
    );
  });
});

describe('adoptConfirmedTradeRows', () => {
  it('adopts the authoritative rows and clears the removal ledger', () => {
    const draft = draftWith({ removedTransactionIds: ['tx-old'] });
    const confirmed: SecuritiesTradeConfirmResult = {
      buys: [{ transactionId: 'tx-new', amount: 1, date: new Date('2026-08-05') }],
      sells: [],
      shareholderFinancing: [],
      dividendPayout: [],
    };
    const next = adoptConfirmedTradeRows(draft, confirmed);
    expect(next.securities.buys[0]?.transactionId).toBe('tx-new');
    expect(next.removedTransactionIds).toEqual([]);
  });

  it('leaves the draft untouched when the confirm returned nothing', () => {
    expect(adoptConfirmedTradeRows(EMPTY_TRADE_DRAFT, undefined)).toBe(EMPTY_TRADE_DRAFT);
  });

  it('keeps untouched prefilled rows and replaces an edited row in place', () => {
    const draft = draftWith({
      securities: { buys: [row(10, 'tx-keep'), { ...row(20, 'tx-edit'), dirty: true }], sells: [] },
    });
    const next = adoptConfirmedTradeRows(draft, {
      buys: [{ transactionId: 'tx-edit', amount: 99, date: new Date('2026-08-05') }],
      sells: [],
      shareholderFinancing: [],
      dividendPayout: [],
    });

    expect(next.securities.buys.map((r) => [r.transactionId, r.amount])).toEqual([
      ['tx-keep', 10],
      ['tx-edit', 99],
    ]);
  });

  it('appends a confirmed new row and clears its dirty flag', () => {
    const draft = draftWith({ securities: { buys: [{ ...row(10), dirty: true }], sells: [] } });
    const next = adoptConfirmedTradeRows(draft, {
      buys: [{ transactionId: 'tx-new', amount: 10, date: new Date('2026-08-05') }],
      sells: [],
      shareholderFinancing: [],
      dividendPayout: [],
    });

    expect(next.securities.buys).toHaveLength(1);
    expect(next.securities.buys[0]).toMatchObject({ transactionId: 'tx-new', amount: 10 });
    expect(next.securities.buys[0]?.dirty).toBeUndefined();
  });
});

describe('pendingTradeRows', () => {
  it('returns only the rows the user added or edited', () => {
    const draft = draftWith({
      securities: {
        buys: [row(10, 'tx-clean'), { ...row(20, 'tx-dirty'), dirty: true }, row(30)],
        sells: [],
      },
    });

    expect(pendingTradeRows(draft).securities.buys).toEqual([
      {
        transactionId: 'tx-dirty',
        amount: 20,
        date: new Date('2026-08-05'),
        description: undefined,
        projectId: null,
      },
    ]);
  });

  it('returns an empty set when nothing was touched', () => {
    const draft = draftWith({ securities: { buys: [row(10, 'tx-clean')], sells: [] } });

    expect(pendingTradeRows(draft).securities.buys).toEqual([]);
  });

  it('marks an added row dirty', () => {
    const next = applyTradeCommand(EMPTY_TRADE_DRAFT, {
      type: 'ADD',
      bucket: 'buys',
      row: row(100),
    });

    expect(next.securities.buys[0]?.dirty).toBe(true);
  });
});
