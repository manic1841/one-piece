import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type LedgerTransaction } from '@/domains/ledger/schemas';
import { getIntentTypeLabel } from '@/ui/constants/transaction';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({ userProfile: { householdId: 'hh-1' } }),
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

vi.mock('@/ui/features/app/confirm/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

import TransactionsPage from './TransactionsPage';

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

    expect(screen.getByText('Expense transaction')).toBeInTheDocument();
    expect(screen.getByText('Shareholder financing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '融資' }));
    expect(screen.queryByText('Expense transaction')).not.toBeInTheDocument();
    expect(screen.getByText('Shareholder financing')).toBeInTheDocument();

    const activeButton = screen.getByRole('button', { name: '融資' });
    expect(activeButton.className).toContain('border-b');
    expect(activeButton.className).not.toContain('rounded-full');
    expect(activeButton.className).not.toContain('bg-primary');
    expect(activeButton.className).not.toContain('shadow');
  });
});
