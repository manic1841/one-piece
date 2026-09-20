import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { useAccountSnapshots } from '@/ui/features/account/hooks/useAccountSnapshots';

vi.mock('@/ui/features/account/hooks/useAccountSnapshots');

const mockUseAccountSnapshots = vi.mocked(useAccountSnapshots);

import AccountDetailPage from './AccountDetailPage';

const account: AccountWithSnapshot = {
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
    holdings: [
      { symbol: '2330', name: 'TSMC', quantity: 10, cost: 620000, marketValue: 710000, leverage: 1 },
    ],
  },
};

describe('AccountDetailPage', () => {
  it('renders the five spec sections for a securities account', () => {
    mockUseAccountSnapshots.mockReturnValue({
      loading: false,
      error: null,
      snapshots: [
        account.snapshot,
      ] as never,
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AccountDetailPage account={account} />
      </MemoryRouter>,
    );

    expect(screen.getByText('BASIC INFO')).toBeInTheDocument();
    expect(screen.getByText('ENDING BALANCE')).toBeInTheDocument();
    expect(screen.getByText('12M TREND')).toBeInTheDocument();
    expect(screen.getByText('12M HISTORY')).toBeInTheDocument();
    expect(screen.getByText('HOLDINGS')).toBeInTheDocument();
  });

  it('hides the holdings section for non-securities accounts', () => {
    mockUseAccountSnapshots.mockReturnValue({
      loading: false,
      error: null,
      snapshots: [],
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AccountDetailPage
          account={{ ...account, category: 'bank', snapshot: null }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('BASIC INFO')).toBeInTheDocument();
    expect(screen.queryByText('HOLDINGS')).toBeNull();
  });
});
