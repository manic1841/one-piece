import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Layout from './Layout';

const mockLogout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({
    userProfile: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      householdId: 'household-1',
      isGlobalAdmin: false,
    },
    logout: mockLogout,
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

function PageMarker() {
  const { pathname } = useLocation();
  return <div data-testid="page-marker" data-page={pathname} />;
}

function renderLayout({ initialRoute = '/', withPageMarker = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {withPageMarker ? (
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<PageMarker />} />
          </Route>
        </Routes>
      ) : (
        <Layout />
      )}
    </MemoryRouter>,
  );
}

describe('Layout system status bar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders ONE PIECE brand, system-online glyph, and today date in one sticky header', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    expect(header.tagName).toBe('HEADER');
    expect(header.className).toContain('sticky');

    expect(screen.getByRole('link', { name: /one piece/i })).toBeInTheDocument();
    expect(screen.getByText(/system online/i)).toBeInTheDocument();
    expect(screen.getByTestId('header-today')).toBeInTheDocument();
  });

  it('formats today date per browser locale', () => {
    vi.useFakeTimers({ now: new Date('2026-01-15T12:00:00') });

    renderLayout();

    const dateText = screen.getByTestId('header-today').textContent ?? '';
    expect(dateText).toContain('15');
    expect(dateText).toContain('2026');
  });

  it('groups household switcher, search, settings, and avatar on the header', async () => {
    renderLayout();

    expect(await screen.findByTestId('household-switcher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avatar/i })).toBeInTheDocument();
  });

  it('keeps settings, avatar, and logout reachable when the desktop-only controls are hidden', async () => {
    renderLayout();

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    const searchButton = screen.getByRole('button', { name: /search/i });
    const switcher = await screen.findByTestId('household-switcher');

    expect(settingsButton.className).not.toContain('hidden');
    expect(avatarButton.className).not.toContain('hidden');
    expect(searchButton.className).toContain('hidden');
    expect(switcher.parentElement?.className).toContain('hidden');
  });

  it('opens the avatar menu exposing logout and logs out from it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderLayout();

    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    fireEvent.pointerDown(avatarButton);
    fireEvent.click(avatarButton);
    const logoutItem = await screen.findByRole('menuitem', { name: /logout/i });
    fireEvent.pointerDown(logoutItem);
    fireEvent.click(logoutItem);

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('keeps search present but inert', () => {
    renderLayout();

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeDisabled();

    fireEvent.click(searchButton);
  });
});

describe('Layout primary navigation', () => {
  it('navigates to the dashboard from the brand link', () => {
    renderLayout({ initialRoute: '/reports', withPageMarker: true });

    fireEvent.click(screen.getByRole('link', { name: /one piece/i }));

    expect(screen.getByTestId('page-marker').dataset.page).toBe('/');
  });

  it('navigates to settings from the settings control', () => {
    renderLayout({ withPageMarker: true });

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByTestId('page-marker').dataset.page).toBe('/settings');
  });

  it('renders the desktop sidebar removed: no complementary landmark remains', () => {
    renderLayout();

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('keeps mobile primary tabs and the More sheet working', async () => {
    renderLayout();

    const nav = screen.getAllByRole('navigation')[0];
    expect(nav.textContent).toContain('Dashboard');
    expect(nav.textContent).not.toContain('Transactions');

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
  });
});

describe('Layout content width', () => {
  it('unifies content under the centered container with no sidebar offsets', () => {
    renderLayout();

    const main = screen.getByRole('main');
    expect(main.className).not.toMatch(/(^|\s)md:pl-56(\s|$)/);
    expect(main.className).not.toMatch(/(^|\s)lg:pl-64(\s|$)/);

    const container = main.firstElementChild as HTMLElement;
    expect(container.className).toContain('max-w-7xl');
    expect(container.className).toContain('mx-auto');
  });
});
