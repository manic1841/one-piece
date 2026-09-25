import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountSnapshotEditor from '@/ui/features/account/pages/AccountSnapshotEditor';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

vi.mock('@/ui/features/account/hooks/useAccountCmds', () => ({
  useAccountCmds: vi.fn(),
}));

vi.mock('@/ui/features/account/hooks/useAccountSnapshotQueries', () => ({
  useAccountSnapshotQueries: vi.fn(),
}));

vi.mock('@/ui/hooks/useExchangeRate', () => ({
  useExchangeRate: vi.fn(),
}));

describe('AccountSnapshotEditor', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuthState } = await import('@/ui/contexts/useAuthState');
    const { useAccountCmds } = await import('@/ui/features/account/hooks/useAccountCmds');
    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');

    vi.mocked(useAuthState).mockReturnValue({
      userProfile: { householdId: 'household-1' },
    } as never);

    vi.mocked(useAccountCmds).mockReturnValue({
      recordSnapshot: vi.fn().mockResolvedValue(undefined),
      loading: false,
    } as never);

    const { useAccountSnapshotQueries } = await import(
      '@/ui/features/account/hooks/useAccountSnapshotQueries'
    );
    vi.mocked(useAccountSnapshotQueries).mockReturnValue({
      getPreviousSnapshot: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(useExchangeRate).mockReturnValue({
      getRate: vi.fn().mockResolvedValue({ ok: true, value: 31.2 }),
      loading: false,
      error: null,
      errorMessage: null,
    } as never);
  });

  it('submits snapshot and closes dialog', async () => {
    const onClose = vi.fn();
    const account = {
      id: 'acc-1',
      name: 'Main Bank',
      category: 'bank',
      currency: 'TWD',
    };

    const { useAccountCmds } = await import('@/ui/features/account/hooks/useAccountCmds');

    render(<AccountSnapshotEditor account={account as never} isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '儲存餘額' }));

    await waitFor(() => {
      expect(vi.mocked(useAccountCmds).mock.results[0]?.value.recordSnapshot).toHaveBeenCalledWith(
        'acc-1',
        expect.objectContaining({
          accountId: 'acc-1',
        }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows validation error when exchange rate is not positive', async () => {
    const onClose = vi.fn();
    const account = {
      id: 'acc-usd',
      name: 'USD Bank',
      category: 'bank',
      currency: 'USD',
    };

    render(<AccountSnapshotEditor account={account as never} isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Exchange Rate'), {
      target: { value: '0' },
    });

    fireEvent.click(screen.getByRole('button', { name: '儲存餘額' }));

    expect(await screen.findByText('匯率需大於 0')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps TWD create form as balance-only input', async () => {
    const account = {
      id: 'acc-twd',
      name: 'TWD Bank',
      category: 'bank',
      currency: 'TWD',
    };

    render(<AccountSnapshotEditor account={account as never} isOpen={true} onClose={vi.fn()} />);

    expect(screen.queryByLabelText('Original Amount TWD')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Balance (TWD)')).toBeInTheDocument();
  });

  it('imports previous month holdings for securities account', async () => {
    const account = {
      id: 'acc-sec',
      name: 'Brokerage',
      category: 'securities',
      currency: 'TWD',
    };

    const { useAccountSnapshotQueries } = await import(
      '@/ui/features/account/hooks/useAccountSnapshotQueries'
    );
    const { useAccountCmds } = await import('@/ui/features/account/hooks/useAccountCmds');
    const getPreviousSnapshot = vi.fn().mockResolvedValue({
      id: 'snap-1',
      accountId: 'acc-sec',
      year: 2026,
      month: 2,
      amount: 1000,
      holdings: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          cost: 150,
          marketValue: 1200,
        },
      ],
    });
    vi.mocked(useAccountCmds).mockReturnValue({
      recordSnapshot: vi.fn().mockResolvedValue(undefined),
      loading: false,
    } as never);
    vi.mocked(useAccountSnapshotQueries).mockReturnValue({ getPreviousSnapshot } as never);

    render(<AccountSnapshotEditor account={account as never} isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '導入上月持倉' }));

    await waitFor(() => {
      expect(getPreviousSnapshot).toHaveBeenCalledWith(
        'acc-sec',
        expect.any(Number),
        expect.any(Number),
      );
      expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Apple Inc.')).toBeInTheDocument();
    });
  });

  it('shows error when previous snapshot has no holdings', async () => {
    const account = {
      id: 'acc-sec-2',
      name: 'Brokerage 2',
      category: 'securities',
      currency: 'TWD',
    };

    const { useAccountSnapshotQueries } = await import(
      '@/ui/features/account/hooks/useAccountSnapshotQueries'
    );
    const { useAccountCmds } = await import('@/ui/features/account/hooks/useAccountCmds');
    vi.mocked(useAccountCmds).mockReturnValue({
      recordSnapshot: vi.fn().mockResolvedValue(undefined),
      loading: false,
    } as never);
    vi.mocked(useAccountSnapshotQueries).mockReturnValue({
      getPreviousSnapshot: vi.fn().mockResolvedValue(null),
    } as never);

    render(<AccountSnapshotEditor account={account as never} isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '導入上月持倉' }));

    expect(await screen.findByText('上個月沒有可導入的持倉資料')).toBeInTheDocument();
  });

  it('shows an error and keeps the existing rate when fetching fails', async () => {
    const onClose = vi.fn();
    const account = {
      id: 'acc-usd',
      name: 'USD Bank',
      category: 'bank',
      currency: 'USD',
    };
    const snapshot = {
      year: 2026,
      month: 8,
      amount: 3120,
      originalAmount: 100,
      exchangeRate: 31.2,
      holdings: [],
    };

    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
    vi.mocked(useExchangeRate).mockReturnValue({
      getRate: vi
        .fn()
        .mockResolvedValue({ ok: false, kind: 'failed', error: new Error('no rate') }),
      loading: false,
      error: null,
      errorMessage: null,
    } as never);

    render(
      <AccountSnapshotEditor
        account={account as never}
        isOpen={true}
        snapshot={snapshot as never}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Rate' }));

    expect(await screen.findByText('取得匯率失敗，請稍後再試或手動輸入匯率')).toBeInTheDocument();
    expect((screen.getByLabelText('Exchange Rate') as HTMLInputElement).value).toBe('31.2');
    expect(onClose).not.toHaveBeenCalled();
  });
});
