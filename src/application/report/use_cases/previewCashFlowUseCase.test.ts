import { describe, expect, it } from 'vitest';

import { previewCashFlowUseCase } from './previewCashFlowUseCase';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

function entry(code: string, debit: number, credit: number): JournalEntryLine {
  return { ledgerCode: code, debit, credit };
}

describe('PreviewCashFlowUseCase', () => {
  it('computes cash flow from entries and balances', () => {
    const result = previewCashFlowUseCase.execute({
      yearMonth: '2025-06',
      entries: [entry('income:salary', 0, 1000)],
      beginningBalance: 500,
      actualBalance: 1500,
    });

    expect(result.yearMonth).toBe('2025-06');
    expect(result.beginningBalance).toBe(500);
    expect(result.actualBalance).toBe(1500);
    expect(result.endingBalance).toBe(result.beginningBalance + result.netCashChange);
  });

  it('returns zero net change when no entries', () => {
    const result = previewCashFlowUseCase.execute({
      yearMonth: '2025-06',
      entries: [],
      beginningBalance: 0,
      actualBalance: 0,
    });

    expect(result.netCashChange).toBe(0);
    expect(result.adjustment).toBe(0);
  });
});
