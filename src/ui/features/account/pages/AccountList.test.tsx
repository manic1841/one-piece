import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';

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

import AccountList from './AccountList';

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
  recordSnapshot: vi.fn().mockResolvedValue(undefined),
  updateSnapshot: vi.fn().mockResolvedValue(undefined),
  deleteSnapshot: vi.fn().mockResolvedValue(undefined),
  reorderAccounts: vi.fn().mockResolvedValue(undefined),
  loading: false,
  error: null,
  errorMessage: null,
};

const renderList = () =>
  render(
    <MemoryRouter>
      <AccountList />
    </MemoryRouter>,
  );

describe('AccountList header actions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps only the create action in the header with no CSV export or import', async () => {
    mockUseAccounts.mockReturnValue(accountsBase);
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);

    renderList();

    expect(screen.getByRole('button', { name: /新增帳戶/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '匯出' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /匯入/ })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

  it('renders the show-inactive toggle with the unified 顯示停用 / 隱藏停用 wording', async () => {
    mockUseAccounts.mockReturnValue(accountsBase);
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);

    renderList();

    const toggle = await screen.findByRole('button', { name: '顯示停用' });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '隱藏停用' })).toBeInTheDocument();
  });

  it('keeps inactive accounts hidden by default', async () => {
    mockUseAccounts.mockReturnValue({
      ...accountsBase,
      fetchAccountsWithSnapshots: vi.fn().mockResolvedValue({
        ok: true,
        value: [
          account({ id: 'b1', name: 'Main Bank', category: 'bank' }),
          account({ id: 'old', name: 'Old Bank', category: 'bank', isActive: false }),
        ],
      }),
    });
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);

    renderList();

    expect(await screen.findByText('Main Bank')).toBeInTheDocument();
    expect(screen.queryByText('Old Bank')).not.toBeInTheDocument();
  });
});

describe('AccountList grouped tables', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders CASH/BANK/SECURITIES sections with Account | Ending Balance | As of columns', async () => {
    mockUseAccounts.mockReturnValue({
      ...accountsBase,
      fetchAccountsWithSnapshots: vi.fn().mockResolvedValue({
        ok: true,
        value: [
          account({ id: 'c1', name: 'Wallet', category: 'cash', snapshot: { ...snapshot } as never }),
          account({
            id: 'b1',
            name: 'Main Bank',
            category: 'bank',
            snapshot: { ...snapshot } as never,
          }),
          account({
            id: 's1',
            name: 'Brokerage',
            category: 'securities',
            snapshot: { ...snapshot } as never,
          }),
        ],
      }),
    });
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);

    renderList();

    expect(await screen.findByText('CASH')).toBeInTheDocument();
    expect(screen.getByText('BANK')).toBeInTheDocument();
    expect(screen.getByText('SECURITIES')).toBeInTheDocument();

    const bankSection = screen.getByText('BANK').closest('section') as HTMLElement;
    expect(within(bankSection).getByText('Account')).toBeInTheDocument();
    expect(within(bankSection).getByText('Ending Balance')).toBeInTheDocument();
    expect(within(bankSection).getByText('As of')).toBeInTheDocument();
    expect(within(bankSection).getByText('Main Bank')).toBeInTheDocument();
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
    mockUseAccounts.mockReturnValue({
      ...accountsBase,
      fetchAccountsWithSnapshots: vi.fn().mockResolvedValue({ ok: true, value: accounts }),
    });
    mockUseAccountCmds.mockReturnValue(cmdsBase as never);
    mockUseNavigate.mockReturnValue(navigate);

    return renderList();
  };

  it('renders a grip handle on every row', async () => {
    setup([bankA, bankB]);

    const gripsA = await screen.findAllByTestId('account-grip-b1');
    expect(gripsA).toHaveLength(1);
    expect(gripsA[0].tagName).toBe('BUTTON');
    expect(gripsA[0].getAttribute('aria-label')).toContain('Alpha Bank');

    const gripsB = await screen.findAllByTestId('account-grip-b2');
    expect(gripsB).toHaveLength(1);
    expect(gripsB[0].tagName).toBe('BUTTON');
    expect(gripsB[0].getAttribute('aria-label')).toContain('Beta Bank');
  });

  it('navigates on row click while the grip is present', async () => {
    setup([bankA]);

    fireEvent.click(await screen.findByTestId('account-row-b1'));
    expect(navigate).toHaveBeenCalledWith('/accounts/b1');
  });

  it('does not navigate when the grip handle is clicked', async () => {
    setup([bankA]);

    fireEvent.click(await screen.findByTestId('account-grip-b1'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('persists the new order through the reorder use case after a keyboard drag', async () => {
    setup([bankA, bankB]);

    const rowA = await screen.findByTestId('account-row-b1');
    const rowB = await screen.findByTestId('account-row-b2');

    // jsdom reports zero rects; give the two rows real geometry so
    // dnd-kit collision detection can resolve a drop target.
    vi.spyOn(rowA, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, bottom: 48, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(rowB, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 48, top: 48, left: 0, bottom: 96, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);

    const grip = screen.getByTestId('account-grip-b1');
    fireEvent.keyDown(grip, { key: ' ', code: 'Space' });

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

    const rowA = await screen.findByTestId('account-row-b1');
    const rowB = await screen.findByTestId('account-row-b2');

    vi.spyOn(rowA, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, bottom: 48, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(rowB, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 48, top: 48, left: 0, bottom: 96, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);

    const grip = screen.getByTestId('account-grip-b1');
    fireEvent.keyDown(grip, { key: ' ', code: 'Space' });

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
