import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';

import AccountList from './AccountList';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('@/ui/features/account/hooks/useAccounts');
vi.mock('@/ui/features/account/hooks/useAccountCmds');
vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: {
      uid: 'user-1',
      email: 'qa@onepiece.test',
      displayName: 'QA User',
      householdId: 'household-1',
    },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockUseAccounts = vi.mocked(useAccounts);
const mockUseAccountCmds = vi.mocked(useAccountCmds);
const mockUseNavigate = vi.mocked(useNavigate);

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

const snapshot = { amount: 1800000, year: 2026, month: 9 };

const accountsBase = {
  fetchAccounts: vi.fn(),
  fetchAccountsWithSnapshots: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  loading: false,
  error: null,
  errorMessage: null,
};

const cmdsBase = {
  createAccount: vi.fn().mockResolvedValue(undefined),
  updateAccount: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  reorderAccounts: vi.fn().mockResolvedValue(undefined),
  loading: false,
  error: null,
};

const renderList = () =>
  render(
    <MemoryRouter>
      <AccountList />
    </MemoryRouter>,
  );

const mockAccounts = (value: AccountWithSnapshot[]) => {
  mockUseAccounts.mockReturnValue({
    ...accountsBase,
    fetchAccountsWithSnapshots: vi.fn().mockResolvedValue({ ok: true, value }),
  });
  mockUseAccountCmds.mockReturnValue(cmdsBase as never);
};

describe('AccountList header and summary', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps only the create action in the header with no CSV export or import', async () => {
    mockAccounts([]);

    renderList();

    expect(screen.getByRole('button', { name: /新增帳戶/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '匯出' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /匯入/ })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

  it('summarises the total balance and the active count', async () => {
    mockAccounts([
      account({ id: 'b1', snapshot: { ...snapshot } as never }),
      account({ id: 'b2', isActive: false, snapshot: { ...snapshot } as never }),
    ]);

    renderList();

    // Only the active account's balance counts towards the household total.
    await waitFor(() =>
      expect(screen.getByTestId('account-total-balance')).toHaveTextContent('NT$1,800,000'),
    );
    expect(screen.getByTestId('account-active-count')).toHaveTextContent('1');
  });

  it('reports a failed load instead of an empty state', async () => {
    mockUseAccounts.mockReturnValue({
      ...accountsBase,
      fetchAccountsWithSnapshots: vi
        .fn()
        .mockResolvedValue({ ok: false, kind: 'failed', error: new Error('nope') }),
      error: new Error('nope'),
    });
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);

    renderList();

    expect(await screen.findByText('無法載入帳戶清單。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument();
  });
});

describe('AccountList view filter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps inactive accounts hidden by default and reveals them on 含停用', async () => {
    mockAccounts([
      account({ id: 'b1', name: 'Main Bank' }),
      account({ id: 'old', name: 'Old Bank', isActive: false }),
    ]);

    renderList();

    expect(await screen.findByText('Main Bank')).toBeInTheDocument();
    expect(screen.queryByText('Old Bank')).not.toBeInTheDocument();

    const filter = screen.getByRole('group', { name: '帳戶狀態篩選' });
    fireEvent.click(within(filter).getByRole('button', { name: '含停用' }));

    expect(await screen.findByText('Old Bank')).toBeInTheDocument();
  });
});

describe('AccountList grouped tables', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders CASH/BANK/SECURITIES sections with the shared column heads', async () => {
    mockAccounts([
      account({ id: 'c1', name: 'Wallet', category: 'cash', snapshot: { ...snapshot } as never }),
      account({ id: 'b1', name: 'Main Bank', snapshot: { ...snapshot } as never }),
      account({
        id: 's1',
        name: 'Brokerage',
        category: 'securities',
        snapshot: { ...snapshot } as never,
      }),
    ]);

    renderList();

    expect(await screen.findByText('CASH')).toBeInTheDocument();
    expect(screen.getByText('BANK')).toBeInTheDocument();
    expect(screen.getByText('SECURITIES')).toBeInTheDocument();

    const bankSection = screen.getByText('BANK').closest('section') as HTMLElement;
    expect(within(bankSection).getByRole('columnheader', { name: '帳戶' })).toBeInTheDocument();
    expect(within(bankSection).getByRole('columnheader', { name: '狀態' })).toBeInTheDocument();
    expect(
      within(bankSection).getByRole('columnheader', { name: '期末餘額' }),
    ).toBeInTheDocument();
    expect(
      within(bankSection).getByRole('columnheader', { name: '結算月份' }),
    ).toBeInTheDocument();
    expect(within(bankSection).getByText('Main Bank')).toBeInTheDocument();
  });

  it('marks a foreign-currency account with a currency badge', async () => {
    mockAccounts([
      account({ id: 'b1', name: 'US Bank', currency: 'USD', snapshot: { ...snapshot } as never }),
      account({ id: 'b2', name: 'Main Bank', snapshot: { ...snapshot } as never }),
    ]);

    renderList();

    const usRow = await screen.findByTestId('account-row-b1');
    expect(within(usRow).getByText('USD')).toBeInTheDocument();
  });

  it('shows a filter-aware empty state when the view has no rows', async () => {
    mockAccounts([account({ id: 'old', name: 'Old Bank', isActive: false })]);

    renderList();

    expect(await screen.findByText('NO ACCOUNT IN VIEW')).toBeInTheDocument();
  });
});

describe('AccountList drag reorder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const makeBank = (id: string, name: string, order: number): AccountWithSnapshot =>
    account({ id, name, category: 'bank', order, snapshot: { ...snapshot } as never });

  const bankA = makeBank('b1', 'Alpha Bank', 0);
  const bankB = makeBank('b2', 'Beta Bank', 1);

  const setup = (accounts: AccountWithSnapshot[]) => {
    mockAccounts(accounts);
    mockUseNavigate.mockReturnValue(navigate);
  };

  const stubRowGeometry = (rows: HTMLElement[]) => {
    rows.forEach((row, index) => {
      const top = index * 48;
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 48,
        right: 400,
        width: 400,
        height: 48,
        toJSON: () => ({}),
      } as DOMRect);
    });
  };

  it('renders a grip handle on every row', async () => {
    setup([bankA, bankB]);

    // Desktop and mobile each render the same sortable row, so each grip is
    // expected twice.
    const gripsA = await screen.findAllByTestId('account-grip-b1');
    expect(gripsA).toHaveLength(2);
    gripsA.forEach((grip) => {
      expect(grip.tagName).toBe('BUTTON');
      expect(grip.getAttribute('aria-label')).toContain('Alpha Bank');
    });
  });

  it('navigates on row click while the grip is present', async () => {
    setup([bankA]);

    fireEvent.click(await screen.findByTestId('account-row-b1'));
    expect(navigate).toHaveBeenCalledWith('/accounts/b1');
  });

  it('does not navigate when the grip handle is clicked', async () => {
    setup([bankA]);

    fireEvent.click((await screen.findAllByTestId('account-grip-b1'))[0]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('persists the new order through the reorder use case after a keyboard drag', async () => {
    setup([bankA, bankB]);

    stubRowGeometry([
      await screen.findByTestId('account-row-b1'),
      await screen.findByTestId('account-row-b2'),
    ]);

    fireEvent.keyDown(screen.getAllByTestId('account-grip-b1')[0], { key: ' ', code: 'Space' });

    // KeyboardSensor attaches its document keydown listener in a setTimeout.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(cmdsBase.reorderAccounts).toHaveBeenCalledWith([
        { id: 'b2', order: 0 },
        { id: 'b1', order: 1 },
      ]);
    });
  });

  it('persists drop order even when an inactive account is hidden from the default view', async () => {
    const hiddenInactive = makeBank('b0', 'Old Bank', 0);
    hiddenInactive.isActive = false;
    setup([hiddenInactive, bankA, bankB]);

    stubRowGeometry([
      await screen.findByTestId('account-row-b1'),
      await screen.findByTestId('account-row-b2'),
    ]);

    fireEvent.keyDown(screen.getAllByTestId('account-grip-b1')[0], { key: ' ', code: 'Space' });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(cmdsBase.reorderAccounts).toHaveBeenCalledWith([
        { id: 'b0', order: 0 },
        { id: 'b2', order: 1 },
        { id: 'b1', order: 2 },
      ]);
    });
  });
});
