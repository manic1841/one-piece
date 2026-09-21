import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAccountListController } from '@/ui/features/account/hooks/useAccountListController';

const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/ui/features/account/hooks/useAccountListController');

const mockUseAccountListController = vi.mocked(useAccountListController);

import AccountList from './AccountList';

const account = (overrides: Partial<AccountWithSnapshot>): AccountWithSnapshot => ({
  id: 'acc-1',
  name: 'Main Bank',
  category: 'bank',
  currency: 'TWD',
  order: 0,
  isActive: true,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  snapshot: null,
  ...overrides,
});

const controllerBase = {
  accounts: [] as AccountWithSnapshot[],
  localAccounts: [] as AccountWithSnapshot[],
  loadingAccounts: false,
  showForm: false,
  setShowForm: vi.fn(),
  isReorderMode: false,
  setIsReorderMode: vi.fn(),
  draggedAccountId: null as string | null,
  dragOverAccountId: null as string | null,
  snapshotAccountId: null as string | null,
  setSnapshotAccountId: vi.fn(),
  historyAccountId: null as string | null,
  setHistoryAccountId: vi.fn(),
  fileInputRef: { current: null },
  importing: false,
  togglingAccountId: null as string | null,
  exportToCSV: vi.fn(),
  handleCreate: vi.fn(),
  handleImport: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragEnter: vi.fn(),
  handleDrop: vi.fn(),
  handleDragEnd: vi.fn(),
  saveOrder: vi.fn(),
  cancelReorderMode: vi.fn(),
  closeSnapshotEditor: vi.fn(),
  closeHistoryDialog: vi.fn(),
  handleToggleActive: vi.fn(),
};

describe('AccountList grouped tables', () => {
  it('renders CASH/BANK/SECURITIES sections with Account | Ending Balance | As of columns', () => {
    mockUseAccountListController.mockReturnValue({
      ...controllerBase,
      localAccounts: [
        account({ id: 'c1', name: 'Wallet', category: 'cash', snapshot: { amount: 120000, year: 2026, month: 9 } as never }),
        account({ id: 'b1', name: 'Main Bank', category: 'bank', snapshot: { amount: 1800000, year: 2026, month: 9 } as never }),
        account({ id: 's1', name: 'Brokerage', category: 'securities', snapshot: { amount: 2060000, year: 2026, month: 9 } as never }),
      ],
    });

    render(<AccountList />);

    expect(screen.getByText('CASH')).toBeInTheDocument();
    expect(screen.getByText('BANK')).toBeInTheDocument();
    expect(screen.getByText('SECURITIES')).toBeInTheDocument();

    const bankSection = screen.getByText('BANK').closest('section') as HTMLElement;
    expect(within(bankSection).getByText('Account')).toBeInTheDocument();
    expect(within(bankSection).getByText('Ending Balance')).toBeInTheDocument();
    expect(within(bankSection).getByText('As of')).toBeInTheDocument();
    expect(within(bankSection).getByText('Main Bank')).toBeInTheDocument();
  });

  it('renders clickable account rows that navigate on click', () => {
    mockUseAccountListController.mockReturnValue({
      ...controllerBase,
      localAccounts: [
        account({ id: 'b1', name: 'Main Bank', category: 'bank', snapshot: { amount: 1800000, year: 2026, month: 9 } as never }),
      ],
    });

    render(<AccountList />);

    fireEvent.click(screen.getByText('Main Bank'));
    expect(navigate).toHaveBeenCalledWith('/accounts/b1');
  });
});
