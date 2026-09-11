import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Layout from './Layout';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({
    userProfile: {
      uid: 'user-1',
      householdId: 'household-1',
      isGlobalAdmin: false,
    },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/application/household/use_cases/getHouseholdUseCase', () => ({
  getHouseholdUseCase: {
    execute: vi.fn().mockResolvedValue({ id: 'household-1', name: 'Test Household' }),
  },
}));

vi.mock('@/ui/features/household/components/HouseholdSwitcher', () => ({
  default: () => <div data-testid="household-switcher" />,
}));

function renderLayout(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Layout />
    </MemoryRouter>,
  );
}

describe('Layout mobile navigation', () => {
  it('shows four primary tabs and a More button, not the full nine-item bar', () => {
    renderLayout();

    const nav = screen.getAllByRole('navigation')[0];

    expect(nav.textContent).toContain('Dashboard');
    expect(nav.textContent).toContain('Projects');
    expect(nav.textContent).toContain('Accounts');
    expect(nav.textContent).toContain('Reports');
    expect(nav.textContent).not.toContain('Transactions');
    expect(nav.textContent).not.toContain('Settings');
  });

  it('opens the more sheet listing the five secondary destinations', async () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Retirement').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Portfolios').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Debt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

  it('closes the sheet via the close control', async () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('navigates to a secondary destination and closes the sheet', async () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    const transactionsLink = (await screen.findAllByText('Transactions'))[0].closest('a');
    expect(transactionsLink).not.toBeNull();

    fireEvent.pointerDown(transactionsLink!);
    fireEvent.click(transactionsLink!);
    await waitFor(() => {
      const dialogs = screen.queryAllByRole('dialog');
      expect(dialogs.some((dialog) => (dialog as HTMLElement).dataset.state === 'open')).toBe(false);
    });
  });
});
