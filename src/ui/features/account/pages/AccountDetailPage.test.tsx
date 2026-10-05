import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCOUNT_DANGER_LABELS, ACCOUNT_DETAIL_LABELS } from '@/ui/constants/account/detailLabels';
import { useAccountDetailPage } from '@/ui/features/account/hooks/useAccountDetailPage';
import { type AccountWithSnapshot } from '@/ui/features/account/viewmodels/account.vm';

import AccountDetailPage from './AccountDetailPage';

vi.mock('@/ui/features/account/hooks/useAccountDetailPage');

const mockUseAccountDetailPage = vi.mocked(useAccountDetailPage);

const account = {
  id: 'a1',
  name: 'Bank A',
  category: 'bank',
  currency: 'TWD',
  isActive: true,
  createdAt: new Date('2026-01-01'),
} as unknown as AccountWithSnapshot;

const emptyTrend = { values: [], labels: [], points: [], hasData: false };

const baseController = {
  activeAccount: account,
  name: 'Bank A',
  loading: false,
  error: null,
  notFound: false,
  reload: vi.fn(),
  isActive: true,
  trend: emptyTrend,
  historyRows: [],
  latestRow: undefined,
  handleRename: vi.fn(),
  handleToggleActive: vi.fn(),
  handleDelete: vi.fn(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountDetailPage />
    </MemoryRouter>,
  );

describe('AccountDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountDetailPage.mockReturnValue(baseController as never);
  });

  it('renders the data sections', () => {
    renderPage();

    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.BASIC_INFO_SECTION_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(ACCOUNT_DETAIL_LABELS.ENDING_BALANCE_SECTION_TITLE),
    ).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.TREND_SECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.HISTORY_SECTION_TITLE)).toBeInTheDocument();
  });

  it('shows the loading skeleton before the account resolves', () => {
    mockUseAccountDetailPage.mockReturnValue({ ...baseController, loading: true } as never);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.LOADING_LABEL)).toBeInTheDocument();
  });

  it('shows the not-found empty state when the account is missing', () => {
    mockUseAccountDetailPage.mockReturnValue({
      ...baseController,
      activeAccount: undefined,
      notFound: true,
    } as never);

    renderPage();

    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.NOT_FOUND_TITLE)).toBeInTheDocument();
  });

  it('shows the load error with a retry action when the fetch fails', () => {
    const reload = vi.fn();
    mockUseAccountDetailPage.mockReturnValue({
      ...baseController,
      activeAccount: undefined,
      error: ACCOUNT_DETAIL_LABELS.LOAD_ERROR,
      reload,
    } as never);

    renderPage();

    expect(screen.getByText(ACCOUNT_DETAIL_LABELS.LOAD_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重試/ }));
    expect(reload).toHaveBeenCalled();
  });

  it('invokes the delete handler from the danger zone', () => {
    const handleDelete = vi.fn();
    mockUseAccountDetailPage.mockReturnValue({ ...baseController, handleDelete } as never);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: ACCOUNT_DANGER_LABELS.DELETE }));
    expect(handleDelete).toHaveBeenCalled();
  });
});
