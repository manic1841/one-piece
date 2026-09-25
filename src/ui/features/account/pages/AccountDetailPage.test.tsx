import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkAccountMonthlyUsageUseCase } from '@/application/account/use_cases/checkAccountMonthlyUsageUseCase';
import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';

import AccountDetailPage from './AccountDetailPage';

vi.mock('@/application/account/use_cases/checkAccountMonthlyUsageUseCase');
vi.mock('@/ui/features/account/hooks/useAccountCmds');
vi.mock('@/ui/features/app/confirm/useConfirm');

const mockUseConfirm = vi.mocked(useConfirm);
const mockUseAccountCmds = vi.mocked(useAccountCmds);

const buildAccount = (overrides: Partial<AccountWithSnapshot> = {}): AccountWithSnapshot => ({
  id: 'acc-1',
  name: 'Brokerage',
  category: 'securities',
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

const baseAccount = buildAccount({
  snapshot: {
    id: 'snap-1',
    accountId: 'acc-1',
    year: 2026,
    month: 9,
    amount: 2060000,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    holdings: [{ symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 }],
  },
});

describe('AccountDetailPage lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockUseAccountCmds.mockReturnValue({
      updateAccount: vi.fn().mockResolvedValue({ ok: true, value: true }),
    } as never);
    vi.mocked(checkAccountMonthlyUsageUseCase.execute).mockResolvedValue({
      hasReferences: false,
      referenceCount: 0,
      matchedLedgerCodes: [],
    });
  });

  it('shows the 停用帳戶 action for an active account with no 停用 meta', async () => {
    render(
      <MemoryRouter>
        <AccountDetailPage account={baseAccount} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: '停用帳戶' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '啟用帳戶' })).not.toBeInTheDocument();
    expect(screen.queryByText('停用帳戶', { selector: 'p' })).toBeNull();
  });

  it('shows the 啟用帳戶 action and 停用帳戶 status for an inactive account', async () => {
    render(
      <MemoryRouter>
        <AccountDetailPage account={buildAccount({ isActive: false })} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: '啟用帳戶' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '停用帳戶' })).not.toBeInTheDocument();
    expect(screen.getByText('停用帳戶')).toBeInTheDocument();
  });

  it('deactivates without a dialog when the account has no current-month usage and reflects the new state', async () => {
    const updateAccount = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseAccountCmds.mockReturnValue({ updateAccount } as never);
    render(
      <MemoryRouter>
        <AccountDetailPage account={baseAccount} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '停用帳戶' }));

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acc-1', { isActive: false }));
    expect(vi.mocked(checkAccountMonthlyUsageUseCase.execute)).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', accountCategory: 'securities' }),
    );
    expect(
      mockUseConfirm.mock.results.every((call) => {
        const value = call.value as { confirm?: unknown } | undefined;
        return !value || !value.confirm || vi.mocked(value.confirm).mock.calls.length === 0;
      }),
    ).toBe(true);
    expect(await screen.findByRole('button', { name: '啟用帳戶' })).toBeInTheDocument();
    expect(screen.getByText('停用帳戶')).toBeInTheDocument();
  });

  it('opens the confirmation dialog before deactivating an account with current-month usage', async () => {
    const updateAccount = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseAccountCmds.mockReturnValue({ updateAccount } as never);
    const confirm = vi.fn().mockResolvedValue(false);
    mockUseConfirm.mockReturnValue({ confirm } as never);
    vi.mocked(checkAccountMonthlyUsageUseCase.execute).mockResolvedValue({
      hasReferences: true,
      referenceCount: 3,
      matchedLedgerCodes: ['asset:cash'],
    });
    render(
      <MemoryRouter>
        <AccountDetailPage account={baseAccount} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '停用帳戶' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Disable this account?',
        confirmLabel: 'DISABLE',
      }),
    );
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it('updates the account when the confirmation is accepted', async () => {
    const updateAccount = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseAccountCmds.mockReturnValue({ updateAccount } as never);
    const confirm = vi.fn().mockResolvedValue(true);
    mockUseConfirm.mockReturnValue({ confirm } as never);
    vi.mocked(checkAccountMonthlyUsageUseCase.execute).mockResolvedValue({
      hasReferences: true,
      referenceCount: 3,
      matchedLedgerCodes: ['asset:cash'],
    });
    render(
      <MemoryRouter>
        <AccountDetailPage account={baseAccount} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '停用帳戶' }));

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acc-1', { isActive: false }));
  });

  it('activates an inactive account without the monthly-usage guard', async () => {
    const updateAccount = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseAccountCmds.mockReturnValue({ updateAccount } as never);
    render(
      <MemoryRouter>
        <AccountDetailPage account={buildAccount({ isActive: false })} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '啟用帳戶' }));

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acc-1', { isActive: true }));
    expect(vi.mocked(checkAccountMonthlyUsageUseCase.execute)).not.toHaveBeenCalled();
  });

  it('does not reflect the new state when the update fails', async () => {
    const updateAccount = vi.fn().mockResolvedValue({
      ok: false,
      kind: 'failed',
      error: new Error('boom'),
    });
    mockUseAccountCmds.mockReturnValue({ updateAccount } as never);
    render(
      <MemoryRouter>
        <AccountDetailPage account={buildAccount({ isActive: false })} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '啟用帳戶' }));

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acc-1', { isActive: true }));
    expect(await screen.findByRole('button', { name: '啟用帳戶' })).toBeInTheDocument();
  });
});

describe('AccountDetailPage', () => {
  it('renders the five spec sections for a securities account', async () => {
    render(
      <MemoryRouter>
        <AccountDetailPage account={baseAccount} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('BASIC INFO')).toBeInTheDocument();
    expect(screen.getByText('ENDING BALANCE')).toBeInTheDocument();
    expect(screen.getByText('12M TREND')).toBeInTheDocument();
    expect(screen.getByText('12M HISTORY')).toBeInTheDocument();
    expect(screen.getByText('HOLDINGS')).toBeInTheDocument();
  });

  it('hides the holdings section for non-securities accounts', async () => {
    render(
      <MemoryRouter>
        <AccountDetailPage account={buildAccount({ category: 'bank', snapshot: null })} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('BASIC INFO')).toBeInTheDocument();
    expect(screen.queryByText('HOLDINGS')).toBeNull();
  });
});
