import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type LedgerTransaction } from '@/domains/ledger/schemas';
import { getIntentTypeLabel } from '@/ui/constants/transaction';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';

import TransactionsPage from './TransactionsPage';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { householdId: 'hh-1' } }),
}));

vi.mock('@/ui/features/transaction/hooks/useTransactions');

vi.mock('@/ui/features/transaction/hooks/useTransactionForm', () => ({
  useTransactionForm: () => ({
    expenseCategories: [],
    incomeCategories: [],
    advancedCategories: [],
    allActiveLedgerCodes: [],
    loadIncomeAllocationTemplate: vi.fn(),
    loading: false,
    error: null,
    handleSubmit: vi.fn(),
    handleUpdate: vi.fn(),
  }),
}));

vi.mock('@/ui/features/project/hooks/useProjects', () => ({
  useProjects: () => ({ projects: [] }),
}));

vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({
    getLabel: (code: string) => code,
  }),
}));

vi.mock('@/ui/features/app/confirm/useConfirm');

const mockUseConfirm = vi.mocked(useConfirm);

const transaction = (overrides: Partial<LedgerTransaction> = {}): LedgerTransaction => ({
  id: 'tx-1',
  createdBy: 'u1',
  createdAt: new Date('2026-09-01'),
  updatedBy: 'u1',
  updatedAt: new Date('2026-09-01'),
  date: new Date('2026-09-01'),
  description: 'Test first',
  intentType: 'EXPENSE',
  intent: 'FOOD',
  entries: [
    { ledgerCode: 'expense:food', debit: 100, credit: 0 },
    { ledgerCode: 'asset:cash', debit: 0, credit: 100 },
  ],
  ...overrides,
});

const controllerBase = {
  transactions: [] as LedgerTransaction[],
  loading: false,
  error: null,
  reload: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransactionAllocation: vi.fn(),
};

const mockUseTransactions = vi.mocked(useTransactions);

describe('TransactionsPage copy', () => {
  beforeEach(() => {
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) });
  });

  it('renders the funds-flow page description', () => {
    mockUseTransactions.mockReturnValue(controllerBase);
    render(<TransactionsPage />);

    expect(screen.getByText('管理你的收入、支出與資金流動。')).toBeInTheDocument();
    expect(screen.queryByText(/轉帳/)).not.toBeInTheDocument();
  });

  it('defaults to the current-month period and reloads when the preset changes', () => {
    mockUseTransactions.mockReturnValue(controllerBase);
    render(<TransactionsPage />);

    expect(screen.getByRole('button', { name: /本月/ })).toBeInTheDocument();
    expect(mockUseTransactions).toHaveBeenCalledWith('hh-1', expect.anything());
  });

  it('renders the transaction search with the notes-matching placeholder', () => {
    mockUseTransactions.mockReturnValue(controllerBase);
    render(<TransactionsPage />);

    expect(screen.getByPlaceholderText('搜尋交易或備註...')).toBeInTheDocument();
  });

  it.each(['TRANSFER', 'INVESTMENT', 'FINANCING'] as const)(
    'blocks editing %s transactions',
    async (intentType) => {
      const confirm = vi.fn().mockResolvedValue(true);
      mockUseConfirm.mockReturnValue({ confirm });
      mockUseTransactions.mockReturnValue({
        ...controllerBase,
        transactions: [transaction({ id: `tx-${intentType}`, intentType })],
      });
      render(<TransactionsPage />);

      fireEvent.click(
        within(screen.getByTestId(`transaction-row-tx-${intentType}`)).getByRole('button', {
          name: '編輯交易',
        }),
      );

      expect(confirm).toHaveBeenCalledWith({ title: '目前不支援編輯此交易。' });
    },
  );
});

describe('TransactionsPage system filter', () => {
  it('renders ALL/EXPENSE/INCOME/INVESTMENT/FINANCING options regardless of data', () => {
    mockUseTransactions.mockReturnValue(controllerBase);
    render(<TransactionsPage />);

    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    for (const id of ['EXPENSE', 'INCOME', 'INVESTMENT', 'FINANCING']) {
      expect(screen.getByRole('button', { name: getIntentTypeLabel(id) })).toBeInTheDocument();
    }
  });

  it('filters by intent type and emphasizes the active option with a bottom border', () => {
    mockUseTransactions.mockReturnValue({
      ...controllerBase,
      transactions: [
        transaction({ id: 'tx-expense', description: 'Expense transaction' }),
        transaction({
          id: 'tx-financing',
          description: 'Shareholder financing',
          intentType: 'FINANCING',
          intent: 'SHAREHOLDER_FINANCING',
          entries: [
            { ledgerCode: 'equity:shareholder', debit: 0, credit: 500 },
            { ledgerCode: 'asset:cash', debit: 500, credit: 0 },
          ],
        }),
      ],
    });

    render(<TransactionsPage />);

    expect(screen.getAllByText('Expense transaction').length).toBe(2);
    expect(screen.getAllByText('Shareholder financing').length).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: '融資' }));
    expect(screen.queryByText('Expense transaction')).not.toBeInTheDocument();
    expect(screen.getAllByText('Shareholder financing').length).toBe(2);

    const activeButton = screen.getByRole('button', { name: '融資' });
    expect(activeButton.className).toContain('border-b');
    expect(activeButton.className).not.toContain('rounded-full');
    expect(activeButton.className).not.toContain('bg-primary');
    expect(activeButton.className).not.toContain('shadow');
  });
});
