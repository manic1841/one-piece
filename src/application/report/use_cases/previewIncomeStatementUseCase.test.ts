import { describe, expect, it } from 'vitest';

import { previewIncomeStatementUseCase } from './previewIncomeStatementUseCase';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

function makeEntry(
  ledgerCode: string,
  credit: number,
  debit: number,
): JournalEntryLine {
  return { ledgerCode, credit, debit };
}

describe('PreviewIncomeStatementUseCase', () => {
  it('groups income and expense entries and computes net income', () => {
    const entries: JournalEntryLine[] = [
      makeEntry('income:salary', 1000, 0),
      makeEntry('expense:food', 0, 300),
      makeEntry('expense:rent', 0, 500),
    ];

    const result = previewIncomeStatementUseCase.execute({
      yearMonth: '2025-06',
      entries,
    });

    expect(result.yearMonth).toBe('2025-06');
    expect(result.incomeTotal).toBe(1000);
    expect(result.expenseTotal).toBe(800);
    expect(result.netIncome).toBe(200);
    expect(result.incomeItems).toHaveLength(1);
    expect(result.expenseItems).toHaveLength(2);
  });

  it('filters out zero-amount entries', () => {
    const entries: JournalEntryLine[] = [
      makeEntry('income:salary', 0, 0),
      makeEntry('expense:food', 0, 100),
    ];

    const result = previewIncomeStatementUseCase.execute({
      yearMonth: '2025-06',
      entries,
    });

    expect(result.incomeItems).toHaveLength(0);
    expect(result.expenseItems).toHaveLength(1);
  });

  it('uses labelResolver when provided', () => {
    const entries: JournalEntryLine[] = [makeEntry('income:salary', 500, 0)];

    const result = previewIncomeStatementUseCase.execute({
      yearMonth: '2025-06',
      entries,
      labelResolver: (code) => `LABEL:${code}`,
    });

    expect(result.incomeItems[0].label).toBe('LABEL:income:salary');
  });
});
