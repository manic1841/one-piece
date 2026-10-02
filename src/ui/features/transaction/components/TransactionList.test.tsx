import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ACCOUNTING_DETAILS_ENTRY_LABEL,
  ACCOUNTING_DETAILS_SECTION_LABEL,
} from '@/ui/constants/transaction/displayLabels';

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
  monthHeaderText: '2026 年 9 月',
  sortTimestamp: 0,
  signedAmount: -100,
  amountText: '-100',
  signedAmountText: '-NT$100',
  isPositive: false,
  hasCashLedger: true,
  entries: [],
  ...overrides,
});

const entry = (overrides: Partial<TransactionListItemVM['entries'][number]> = {}) => ({
  ledgerCode: 'expense:food',
  ledgerLabel: '餐飲',
  debit: 100,
  credit: 0,
  hasInvestmentDetail: false,
  ...overrides,
});

describe('TransactionList month header', () => {
  it('renders the zh-TW month header with muted count, without background', () => {
    render(<TransactionList items={[baseItem()]} loading={false} />);

    const header = screen.getByRole('heading', { name: '2026 年 9 月' });
    expect(header).toBeVisible();
    expect(header.className).not.toContain('bg-muted');
    expect(screen.getByText('1 筆交易')).toBeVisible();
  });

  it('renders no date filter inputs in the list: the period picker lives in the page toolbar', () => {
    render(<TransactionList items={[baseItem()]} loading={false} />);

    expect(screen.queryByText('FROM')).toBeNull();
    expect(screen.queryByText('TO')).toBeNull();
    expect(screen.queryByRole('button', { name: 'APPLY' })).toBeNull();
  });
});

describe('TransactionList loading and empty states', () => {
  it('renders a skeleton list while loading instead of a Card', () => {
    const { container } = render(<TransactionList items={[]} loading={true} />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(container.querySelector('.rounded-lg')).toBeNull();
    expect(screen.queryByText(/Loading transactions/i)).toBeNull();
  });

  it('renders the standard empty state without a Card', () => {
    const { container } = render(<TransactionList items={[]} loading={false} />);

    expect(screen.getByText('○ NO DATA')).toBeVisible();
    expect(screen.getByText('目前期間沒有任何交易紀錄。')).toBeVisible();
    expect(container.querySelector('.rounded-lg')).toBeNull();
  });
});

describe('TransactionItem accounting details', () => {
  it('keeps accounting details collapsed until the row is clicked, then toggles', () => {
    render(<TransactionList items={[baseItem({ entries: [entry()] })]} loading={false} />);

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    expect(screen.queryByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeNull();
    expect(transactionRow).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(transactionRow);

    expect(screen.getByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeVisible();
    expect(transactionRow).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(transactionRow);
    expect(screen.queryByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeNull();
  });

  it('renders the expanded details table with the constants-layer entry label, never the Ledger Code term', () => {
    render(<TransactionList items={[baseItem({ entries: [entry()] })]} loading={false} />);

    fireEvent.click(screen.getByTestId('transaction-row-tx-1'));

    const header = screen.getByRole('columnheader', { name: ACCOUNTING_DETAILS_ENTRY_LABEL });
    expect(header).toBeVisible();
    expect(within(header.closest('tr')!).queryByText(/Ledger Code/i)).toBeNull();
    expect(screen.getByText('餐飲')).toBeVisible();
  });

  it('collapses rows independently: expanding one row does not expand another', () => {
    render(
      <TransactionList
        items={[
          baseItem({ id: 'tx-1', entries: [entry()] }),
          baseItem({
            id: 'tx-2',
            displayTitle: 'Second transaction',
            signedAmount: -200,
            signedAmountText: '-NT$200',
            entries: [entry()],
          }),
        ]}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByTestId('transaction-row-tx-1'));
    expect(screen.getByTestId('transaction-row-tx-1')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('transaction-row-tx-2')).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard toggle on the focusable row', () => {
    render(<TransactionList items={[baseItem({ entries: [entry()] })]} loading={false} />);

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    expect(transactionRow).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(transactionRow, { key: 'Enter' });
    expect(screen.getByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeVisible();

    fireEvent.keyDown(transactionRow, { key: ' ' });
    expect(screen.queryByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeNull();
  });
});

describe('TransactionItem table structure', () => {
  it('renders only legal table rows inside tbody: no div between tbody and tr', () => {
    const { container } = render(
      <TransactionList items={[baseItem()]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    const tbody = container.querySelector('table tbody')!;
    expect(tbody).not.toBeNull();

    Array.from(tbody.children).forEach((child) => {
      expect(child.tagName).toBe('TR');
    });

    const directTrs = Array.from(tbody.children) as HTMLElement[];
    expect(directTrs.length).toBeGreaterThanOrEqual(1);
    expect(directTrs.some((tr) => tr.getAttribute('data-testid') === 'transaction-row-tx-1')).toBe(
      true,
    );
  });

  it('renders the desktop columns in Date / Transaction / Project / Amount / Actions order', () => {
    render(
      <TransactionList items={[baseItem()]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    const dateIndex = headers.indexOf('日期');
    const intentIndex = headers.indexOf('交易');
    const projectIndex = headers.indexOf('專案');
    const amountIndex = headers.indexOf('金額');
    expect(dateIndex).toBeLessThan(intentIndex);
    expect(intentIndex).toBeLessThan(projectIndex);
    expect(projectIndex).toBeLessThan(amountIndex);
    expect(amountIndex).toBeLessThan(headers.indexOf('動作'));
  });

  it('keeps the expanded details row as a separate tr from the transaction row', () => {
    render(
      <TransactionList
        items={[baseItem({ displayTitle: 'Test transaction', entries: [entry()] })]}
        loading={false}
      />,
    );

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    expect(transactionRow.tagName).toBe('TR');
    expect(transactionRow.textContent).toContain('Test transaction');

    fireEvent.click(transactionRow);

    const detailsRow = screen.getByTestId('transaction-details-tx-1');
    expect(detailsRow.tagName).toBe('TR');
    expect(detailsRow).not.toBe(transactionRow);
    expect(detailsRow.textContent).not.toContain('Test transaction');
  });

  it('hides row actions until hover or focus via the opacity pattern', () => {
    render(
      <TransactionList items={[baseItem()]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    const actionsSpan = within(transactionRow)
      .getByRole('button', { name: '編輯交易' })
      .closest('span.flex')!;
    expect(actionsSpan.className).toContain('opacity-0');
    expect(actionsSpan.className).toContain('group-hover:opacity-100');
    expect(actionsSpan.className).toContain('group-focus-within:opacity-100');
  });

  it('applies the clickable-row hover only to the interactive row, not the details row', () => {
    render(<TransactionList items={[baseItem({ entries: [entry()] })]} loading={false} />);

    const transactionRow = screen.getByTestId('transaction-row-tx-1');
    expect(transactionRow.className).toContain('cursor-pointer');
    expect(transactionRow.className).toContain('hover:bg-muted/50');

    fireEvent.click(transactionRow);
    const detailsRow = screen.getByTestId('transaction-details-tx-1');
    expect(detailsRow.className).toContain('hover:bg-transparent');
    expect(detailsRow.className).not.toContain('cursor-pointer');
  });
});

describe('TransactionList mobile compact rows', () => {
  it('renders a mobile compact row per transaction, hidden from md up, with persistent actions', () => {
    render(
      <TransactionList
        items={[
          baseItem({
            id: 'tx-1',
            dateText: '2026-09-21',
            displayTitle: 'Groceries',
            signedAmountText: '-NT$1,800',
            isPositive: false,
          }),
        ]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const compactRow = screen.getByTestId('transaction-row-mobile-tx-1');
    expect(compactRow.className).toContain('md:hidden');
    expect(compactRow.textContent).toContain('2026-09-21');
    expect(compactRow.textContent).toContain('Groceries');
    expect(compactRow.textContent).toContain('-NT$1,800');
    expect(within(compactRow).getByRole('button', { name: '編輯交易' })).not.toBeNull();
    expect(within(compactRow).getByRole('button', { name: '刪除交易' })).not.toBeNull();
  });

  it('expands accounting details from the mobile row click with aria-expanded', () => {
    render(<TransactionList items={[baseItem({ entries: [entry()] })]} loading={false} />);

    const compactRow = screen.getByTestId('transaction-row-mobile-tx-1');
    expect(compactRow).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeNull();

    fireEvent.click(compactRow);

    expect(compactRow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeVisible();
    expect(screen.getByText('餐飲')).toBeVisible();
  });

  it('keeps action clicks from toggling the mobile row expansion', () => {
    render(
      <TransactionList
        items={[baseItem({ entries: [entry()] })]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const compactRow = screen.getByTestId('transaction-row-mobile-tx-1');
    fireEvent.click(within(compactRow).getByRole('button', { name: '編輯交易' }));

    expect(compactRow).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(ACCOUNTING_DETAILS_SECTION_LABEL)).toBeNull();
  });
});
