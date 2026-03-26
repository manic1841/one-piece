import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountSnapshotEditor from '@/ui/features/account/pages/AccountSnapshotEditor';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/ui/features/account/hooks/useAccountCmds', () => ({
  useAccountCmds: vi.fn(),
}));

vi.mock('@/ui/features/account/hooks/useExchangeRate', () => ({
  useExchangeRate: vi.fn(),
}));

describe('AccountSnapshotEditor', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('@/infra/contexts/useAuth');
    const { useAccountCmds } = await import('@/ui/features/account/hooks/useAccountCmds');
    const { useExchangeRate } = await import('@/ui/features/account/hooks/useExchangeRate');

    vi.mocked(useAuth).mockReturnValue({
      userProfile: { householdId: 'household-1' },
    } as never);

    vi.mocked(useAccountCmds).mockReturnValue({
      recordSnapshot: vi.fn().mockResolvedValue(undefined),
      loading: false,
    } as never);

    vi.mocked(useExchangeRate).mockReturnValue({
      getRate: vi.fn().mockResolvedValue(31.2),
      loading: false,
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
});
