import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listDebtSnapshotsUseCase } from '@/application/debt/use_cases/listDebtSnapshotsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DEBT_STATUS_INACTIVE_LABEL, DEBT_STATUS_SETTLED_LABEL } from '@/ui/constants/debt/label';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';

import DebtDetailPage from './DebtDetailPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/application/debt/use_cases/listDebtSnapshotsUseCase', () => ({
  listDebtSnapshotsUseCase: {
    execute: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase');
vi.mock('@/application/debt/use_cases/listDebtPaymentsUseCase', () => ({
  listDebtPaymentsUseCase: {
    execute: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/ui/features/debt/hooks/useDebtAccountCmds');
vi.mock('@/ui/components/confirm/useConfirm');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'd1' })),
  };
});

const mockUseAuth = vi.mocked(useAuthState);
const mockUseConfirm = vi.mocked(useConfirm);
const mockUseDebtAccountCmds = vi.mocked(useDebtAccountCmds);

const buildAccount = (overrides: Partial<DebtAccount> = {}): DebtAccount =>
  ({
    id: 'd1',
    name: 'Mortgage A',
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 5000000,
    currentBalance: 4800000,
    interestRate: 2.1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2044-01-01'),
    graceEndDate: null,
    monthlyPayment: 25000,
    linkedLedgerCode: 'liability:mortgage',
    linkedProjectId: null,
    note: undefined,
    isActive: true,
    closedAt: null,
    createdBy: 'u1',
    createdAt: new Date('2024-01-01'),
    updatedBy: 'u1',
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  }) as DebtAccount;

const renderDetail = (account: DebtAccount) => {
  vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([account]);
  vi.mocked(listDebtSnapshotsUseCase.execute).mockResolvedValue([]);

  return render(
    <MemoryRouter>
      <DebtDetailPage />
    </MemoryRouter>,
  );
};

describe('DebtDetailPage header actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      userProfile: {
        uid: 'u1',
        email: 'user@example.com',
        householdId: 'h1',
      },
    } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockUseDebtAccountCmds.mockReturnValue({
      updateDebtAccount: vi.fn().mockResolvedValue(true),
      removeDebtAccount: vi.fn().mockResolvedValue({ strategy: 'deleted' }),
    } as never);
  });

  it('exposes Edit and Disable in the detail header for an active loan', async () => {
    renderDetail(buildAccount());

    expect(await screen.findByRole('button', { name: '編輯貸款' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '停用貸款' })).toBeInTheDocument();
  });

  it('opens the edit dialog with the loan data', async () => {
    renderDetail(buildAccount());

    fireEvent.click(await screen.findByRole('button', { name: '編輯貸款' }));

    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs.length).toBeGreaterThan(0);
    expect(screen.getAllByText('編輯貸款').length).toBeGreaterThan(0);
  });

  it('deactivates the loan from the header Disable action', async () => {
    const account = buildAccount();
    const updateDebtAccount = vi.fn().mockResolvedValue(true);
    mockUseDebtAccountCmds.mockReturnValue({
      updateDebtAccount,
      removeDebtAccount: vi.fn(),
    } as never);

    renderDetail(account);

    fireEvent.click(await screen.findByRole('button', { name: '停用貸款' }));

    await waitFor(() => expect(updateDebtAccount).toHaveBeenCalledWith('d1', { isActive: false }));
  });

  it('keeps delete as a low-key danger action and calls the existing remove flow', async () => {
    const removeDebtAccount = vi.fn().mockResolvedValue({ strategy: 'deleted' });
    mockUseDebtAccountCmds.mockReturnValue({
      updateDebtAccount: vi.fn(),
      removeDebtAccount,
    } as never);

    renderDetail(buildAccount());

    const deleteButton = await screen.findByRole('button', { name: '刪除貸款' });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(removeDebtAccount).toHaveBeenCalledWith('d1'));
  });

  it('renders the settled status as a glyph + text status, not a badge', async () => {
    renderDetail(buildAccount({ isActive: false, closedAt: new Date('2026-01-01') }));

    const status = await screen.findByText(DEBT_STATUS_SETTLED_LABEL);
    const glyphWrap = status.closest('span')!.parentElement!;
    expect(glyphWrap.textContent).toContain('✓');
    expect(glyphWrap.className).toContain('text-positive');
    expect(glyphWrap.className).not.toMatch(/rounded-|(^|\s)border(-|\s)/);
  });

  it('renders a merely disabled loan as inactive, not settled', async () => {
    renderDetail(buildAccount({ isActive: false, closedAt: null }));

    expect(await screen.findByText(DEBT_STATUS_INACTIVE_LABEL)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '啟用貸款' })).toBeInTheDocument();
  });

  it('renders the history table inline with month rows that expand to payments', async () => {
    renderDetail(buildAccount());

    expect(await screen.findByText('HISTORY')).toBeInTheDocument();
    expect(screen.queryByText('RECENT PAYMENTS')).not.toBeInTheDocument();
  });

  it('shows a loading state before the loan resolves', async () => {
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtSnapshotsUseCase.execute).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DebtDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('載入中…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('載入中…')).not.toBeInTheDocument());
  });

  it('shows the not-found state when the loan does not exist', async () => {
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtSnapshotsUseCase.execute).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DebtDetailPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('找不到貸款')).toBeInTheDocument();
  });
});
