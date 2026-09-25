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
    investmentCategories: [],
    financingCategories: [],
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

  it('renders the transfer-free page description', () => {
    mockUseTransactions.mockReturnValue(controllerBase);
    render(<TransactionsPage />);

    expect(screen.getByText('檢視與管理所有交易紀錄。')).toBeInTheDocument();
    expect(screen.queryByText(/轉帳/)).not.toBeInTheDocument();
  });

  it('shows a generic edit-confirmation dialog for transfer transactions', async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    mockUseConfirm.mockReturnValue({ confirm });
    mockUseTransactions.mockReturnValue({
      ...controllerBase,
      transactions: [
        transaction({
          id: 'tx-transfer',
          description: 'Internal transfer',
          intentType: 'TRANSFER',
          intent: 'TRANSFER_GENERIC',
          entries: [
            { ledgerCode: 'asset:cash', debit: 300, credit: 0 },
            { ledgerCode: 'asset:bank', debit: 0, credit: 300 },
          ],
        }),
      ],
    });
    render(<TransactionsPage />);

    fireEvent.click(
      within(screen.getByTestId('transaction-row-tx-transfer')).getByRole('button', {
        name: '編輯交易',
      }),
    );

    expect(confirm).toHaveBeenCalledWith({ title: '目前不支援編輯此交易。' });
  });
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
