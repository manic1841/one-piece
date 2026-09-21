import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ACCOUNTING_DETAILS_ENTRY_LABEL } from '@/ui/constants/transaction/displayLabels';
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
  entries: [],
  ...overrides,
});

describe('TransactionList date filter row', () => {
  it('wraps and sizes controls by content from md up, so the row cannot overflow 768px', () => {
    render(
      <TransactionList items={[baseItem()]} loading={false} onDateRangeSearch={vi.fn()} />,
    );

    const row = screen.getByText('FROM').closest('div')!.parentElement!;
    expect(row.className).toContain('flex-col');
    expect(row.className).toContain('md:flex-row');
    expect(row.className).toContain('md:flex-wrap');

    const startDateField = screen.getByText('FROM').closest('div')!;
    expect(startDateField.className).toContain('w-full');
    expect(startDateField.className).toContain('md:min-w-56');
    expect(startDateField.className).not.toMatch(/(^|\s)md:w-56(\s|$)/);

    const searchButton = screen.getByRole('button', { name: 'APPLY' });
    expect(searchButton.className).toContain('md:w-auto');
  });
});

describe('TransactionItem accounting details header', () => {
  it('renders the constants-layer entry label, never the Ledger Code term', () => {
    render(
      <TransactionList
        items={[
          baseItem({
            entries: [
              {
                ledgerCode: 'expense:food',
                ledgerLabel: '餐飲',
                debit: 100,
                credit: 0,
                hasInvestmentDetail: false,
              },
            ],
          }),
        ]}
        loading={false}
        onDateRangeSearch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ACCOUNTING DETAILS' }));
    const header = screen.getByRole('columnheader', { name: ACCOUNTING_DETAILS_ENTRY_LABEL });
    expect(header).toBeVisible();
    expect(within(header.closest('tr')!).queryByText(/Ledger Code/i)).toBeNull();
    expect(screen.getByText('餐飲')).toBeVisible();
  });
});

describe('TransactionItem table structure', () => {
  it('renders only legal table rows inside tbody: no div between tbody and tr', () => {
    const { container } = render(
      <TransactionList items={[baseItem()]} loading={false} onDateRangeSearch={vi.fn()} />,
    );

    const tbody = container.querySelector('tbody')!;
    expect(tbody).not.toBeNull();

    Array.from(tbody.children).forEach((child) => {
      expect(child.tagName).toBe('TR');
    });

    const directTrs = Array.from(tbody.children) as HTMLElement[];
    expect(directTrs.length).toBeGreaterThanOrEqual(2);
    expect(directTrs.some((tr) => tr.getAttribute('data-testid') === 'transaction-row-tx-1')).toBe(
      true,
    );
  });

  it('renders the transaction row and its accounting details as separate tr elements', () => {
    render(
      <TransactionList
        items={[baseItem({ displayTitle: 'Test transaction' })]}
        loading={false}
        onDateRangeSearch={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    expect(transactionRow.tagName).toBe('TR');
    expect(transactionRow.textContent).toContain('Test transaction');
    expect(transactionRow.textContent).not.toContain('ACCOUNTING DETAILS');

    const detailsTrigger = screen.getByRole('button', { name: 'ACCOUNTING DETAILS' });
    const detailsRow = detailsTrigger.closest('tr')!;
    expect(detailsRow).not.toBe(transactionRow);
    expect(detailsRow.textContent).not.toContain('Test transaction');
  });
});
