import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectionOpeningPeriods } from '@/application/retirement/workflows/listProjectionOpeningPeriods';

import { OpeningPeriodDialog } from './OpeningPeriodDialog';

const { useIsDesktopMock } = vi.hoisted(() => ({ useIsDesktopMock: vi.fn(() => true) }));
const authMock = { uid: 'u1', isGlobalAdmin: false };

vi.mock('@/ui/features/app/layout/useIsDesktop', () => ({ useIsDesktop: useIsDesktopMock }));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({ useAuthIdentity: () => authMock }));
vi.mock('@/application/retirement/workflows/listProjectionOpeningPeriods', () => ({
  listProjectionOpeningPeriods: { execute: vi.fn() },
}));

const renderDialog = (currentAnchor: string | null = null) =>
  render(
    <OpeningPeriodDialog
      householdId="household-1"
      currentAnchor={currentAnchor}
      onSelect={vi.fn()}
      onClose={vi.fn()}
    />,
  );

describe('OpeningPeriodDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIsDesktopMock.mockReturnValue(true);
  });

  it('shows the loading skeleton first', () => {
    vi.mocked(listProjectionOpeningPeriods.execute).mockReturnValue(new Promise(() => {}) as never);
    renderDialog();

    expect(screen.getByTestId('opening-periods-loading')).toBeInTheDocument();
  });

  it('shows the empty state with a way out when no month qualifies', async () => {
    vi.mocked(listProjectionOpeningPeriods.execute).mockResolvedValue({
      periods: [],
      pinned: null,
    });
    renderDialog();

    expect(
      await screen.findByText('No balance sheet report yet. Type an amount instead.'),
    ).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);
  });

  it('offers a retry when the read fails', async () => {
    vi.mocked(listProjectionOpeningPeriods.execute).mockRejectedValue(new Error('boom'));
    renderDialog();

    expect(await screen.findByText('Could not load the report months.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'RETRY' })).toBeInTheDocument();
  });

  it('marks the pinned row as the current one and lists it first', async () => {
    vi.mocked(listProjectionOpeningPeriods.execute).mockResolvedValue({
      periods: [{ yearMonth: '2026-08', netWorth: 250_000 }],
      pinned: { yearMonth: '2025-07', netWorth: 380_000 },
    });
    renderDialog('2025-07');

    const pinned = await screen.findByTestId('opening-period-2025-07');
    expect(pinned).toHaveAttribute('aria-current', 'true');
    expect(pinned).toHaveTextContent('380,000');
    expect(screen.getByTestId('opening-period-2026-08')).not.toHaveAttribute('aria-current');
    expect(listProjectionOpeningPeriods.execute).toHaveBeenCalledWith(
      expect.objectContaining({ anchorYearMonth: '2025-07' }),
    );
  });

  it('docks a sheet instead of a dialog on mobile', async () => {
    useIsDesktopMock.mockReturnValue(false);
    vi.mocked(listProjectionOpeningPeriods.execute).mockResolvedValue({
      periods: [{ yearMonth: '2026-08', netWorth: 250_000 }],
      pinned: null,
    });
    renderDialog();

    await waitFor(() => expect(screen.getByTestId('opening-period-2026-08')).toBeVisible());
    expect(document.querySelector('.max-h-\\[92vh\\]')).not.toBeNull();
  });
});
