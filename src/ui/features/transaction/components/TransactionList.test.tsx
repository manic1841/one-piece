import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type TransactionListItemVM } from '../viewmodels/transaction-list.vm';
import { TransactionList } from './TransactionList';

const baseItem = (overrides: Partial<TransactionListItemVM> = {}): TransactionListItemVM => ({
  id: 'tx-1',
  intentType: 'EXPENSE',
  displayTitle: 'Test transaction',
  categoryLabel: 'Category',
  categoryKey: 'category',
  dateText: '2026-09-01',
  monthKey: '2026-09',
  sortTimestamp: 0,
  signedAmount: -100,
  amountText: '-100',
  isPositive: false,
  hasCashLedger: true,
  ...overrides,
});

describe('TransactionList date filter row', () => {
  it('wraps and sizes controls by content from md up, so the row cannot overflow 768px', () => {
    render(
      <TransactionList items={[baseItem()]} loading={false} onDateRangeSearch={vi.fn()} />,
    );

    const row = screen.getByText('開始日期').closest('div')!.parentElement!;
    expect(row.className).toContain('flex-col');
    expect(row.className).toContain('md:flex-row');
    expect(row.className).toContain('md:flex-wrap');

    const startDateField = screen.getByText('開始日期').closest('div')!;
    expect(startDateField.className).toContain('w-full');
    expect(startDateField.className).toContain('md:min-w-56');
    expect(startDateField.className).not.toMatch(/(^|\s)md:w-56(\s|$)/);

    const searchButton = screen.getByRole('button', { name: '查詢日期區間' });
    expect(searchButton.className).toContain('md:w-auto');
  });
});
