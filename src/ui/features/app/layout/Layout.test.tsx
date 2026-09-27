import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/features/app/confirm/ConfirmDialog';

import Layout from './Layout';
import { NAVIGATOR_ITEMS, NAV_ITEMS } from './navigation';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockLogout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
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

vi.mock('@/application/dashboard/use_cases/getDashboardOverviewUseCase', () => ({
  getDashboardOverviewUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: vi.fn(function () {
    return { execute: vi.fn().mockResolvedValue(null) };
  }),
}));

vi.mock('../hooks/usePetReaction', () => ({
  usePetReaction: () => 'idle',
}));

vi.mock('./HouseholdSwitcher', () => ({
  default: () => <div data-testid="household-switcher" />,
}));

function PageMarker() {
  const { pathname } = useLocation();
  return <div data-testid="page-marker" data-page={pathname} />;
}

function renderLayout({ initialRoute = '/', withPageMarker = false } = {}) {
  return render(
    <ConfirmDialogProvider>
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
      </MemoryRouter>
    </ConfirmDialogProvider>,
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

  it('renders a site footer with brand, version, and tagline', () => {
    renderLayout();

    expect(screen.getByTestId('footer-brand').textContent).toBe('ONE PIECE');
    expect(screen.getByTestId('footer-version').textContent).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(screen.getByTestId('footer-tagline').textContent).toMatch(
      /data today, a freer tomorrow/i,
    );

    const footer = screen.getByTestId('footer-brand').closest('footer');
    expect(footer).not.toBeNull();
  });

  it('formats today date per browser locale', () => {
    vi.useFakeTimers({ now: new Date('2026-01-15T12:00:00') });

    renderLayout();

    const dateText = screen.getByTestId('header-today').textContent ?? '';
    expect(dateText).toContain('15');
    expect(dateText).toContain('2026');
  });

  it('groups household switcher, search, and avatar on the header', async () => {
    renderLayout();

    expect(await screen.findByTestId('household-switcher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avatar/i })).toBeInTheDocument();
  });

  it('exposes Settings in the avatar menu and navigates to the settings route', async () => {
    renderLayout({ withPageMarker: true });

    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    fireEvent.pointerDown(avatarButton);
    fireEvent.click(avatarButton);

    fireEvent.pointerDown(await screen.findByRole('menuitem', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));

    await waitFor(() => expect(screen.getByTestId('page-marker').dataset.page).toBe('/settings'));
  });

  it('does not render a standalone Settings icon button on the header', () => {
    renderLayout();

    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('keeps avatar and search reachable when the desktop-only controls are hidden', async () => {
    renderLayout();

    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    const searchButton = screen.getByRole('button', { name: /search/i });
    const switcher = await screen.findByTestId('household-switcher');

    expect(avatarButton.className).not.toContain('hidden');
    expect(searchButton.className).not.toContain('hidden');
    expect(switcher.parentElement?.className).toContain('hidden');
  });

  it('keeps the palette trigger reachable on mobile', async () => {
    renderLayout();

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton.className).not.toContain('hidden');

    fireEvent.click(searchButton);
    expect(await screen.findByRole('dialog', { name: /quick access/i })).toBeInTheDocument();
  });

  it('opens the avatar menu exposing logout and logs out from it', async () => {
    renderLayout();

    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    fireEvent.pointerDown(avatarButton);
    fireEvent.click(avatarButton);
    const logoutItem = await screen.findByRole('menuitem', { name: /logout/i });
    fireEvent.pointerDown(logoutItem);
    fireEvent.click(logoutItem);

    fireEvent.click(await screen.findByRole('button', { name: 'LOG OUT' }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('opens the quick access palette from the header search trigger', async () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByRole('dialog', { name: /quick access/i })).toBeInTheDocument();
  });

  it('opens the quick access palette with Ctrl+K and closes it with Escape', async () => {
    renderLayout();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: /quick access/i });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it('does not open the quick access palette for plain k', async () => {
    renderLayout();

    fireEvent.keyDown(window, { key: 'k' });

    expect(screen.queryByRole('dialog', { name: /quick access/i })).not.toBeInTheDocument();
  });

  it('lists a command for every route and navigates on select', async () => {
    renderLayout({ withPageMarker: true });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await screen.findByRole('dialog', { name: /quick access/i });

    const optionCount = screen.getAllByRole('option').length;
    expect(optionCount).toBe(NAV_ITEMS.length);
    expect(optionCount).toBe(10);
    expect(screen.getByRole('option', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /settings/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /retirement/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /quick access/i })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('page-marker').dataset.page).toBe('/retirement');
  });

  it('enables the header search button', () => {
    renderLayout();

    expect(screen.getByRole('button', { name: /search/i })).toBeEnabled();
  });
});

describe('Layout primary navigation', () => {
  it('navigates to the dashboard from the brand link', () => {
    renderLayout({ initialRoute: '/reports', withPageMarker: true });

    fireEvent.click(screen.getByRole('link', { name: /one piece/i }));

    expect(screen.getByTestId('page-marker').dataset.page).toBe('/');
  });

  it('navigates to settings from the avatar menu', async () => {
    renderLayout({ withPageMarker: true });

    const avatarButton = screen.getByRole('button', { name: /avatar/i });
    fireEvent.pointerDown(avatarButton);
    fireEvent.click(avatarButton);
    fireEvent.pointerDown(await screen.findByRole('menuitem', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));

    await waitFor(() => expect(screen.getByTestId('page-marker').dataset.page).toBe('/settings'));
  });

  it('renders the desktop sidebar removed: no complementary landmark remains', () => {
    renderLayout();

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('retires the mobile bottom nav: no bottom navigation landmark remains', () => {
    renderLayout();

    const navs = screen.queryAllByRole('navigation');
    expect(navs).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
  });

  it('keeps the pet button as the sole floating navigator affordance', () => {
    renderLayout();

    expect(screen.getByRole('button', { name: /pixel pet/i })).toBeInTheDocument();
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

describe('Layout pixel pet and navigator', () => {
  it('renders a round pet placeholder fixed bottom-right', () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    expect(pet.className).toContain('fixed');
    expect(pet.className).toMatch(/(right|bottom)-/);
    expect(pet.className).toContain('rounded-full');
  });

  it('renders the pet expression from the reaction API prop, idle by default', () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    expect(pet.dataset.reaction).toBe('idle');
    expect(screen.getByTestId('pet-face')).toBeInTheDocument();
  });

  it('opens the navigator as a floating panel listing the eight navigator destinations', () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);

    const navigator = screen.getByTestId('navigator');
    expect(navigator).toBeInTheDocument();

    const grid = navigator.querySelector('[data-navigator-grid]') as HTMLElement;
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('md:grid-cols-4');

    const items = Array.from(grid.querySelectorAll('a'));
    expect(items).toHaveLength(8);
    expect(items.map((item) => item.getAttribute('href'))).toEqual(
      NAVIGATOR_ITEMS.map((item) => item.to),
    );
    expect(items.map((item) => item.getAttribute('href'))).not.toContain('/');
    expect(items.map((item) => item.getAttribute('href'))).not.toContain('/settings');
  });

  it('keeps the navigator open after the pointer leaves the pet, and closes it on outside click', () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);
    expect(screen.getByTestId('navigator')).toBeInTheDocument();

    fireEvent.mouseLeave(pet);
    expect(screen.getByTestId('navigator')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('navigator-backdrop'));
    expect(screen.queryByTestId('navigator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigator-sheet')).not.toBeInTheDocument();
  });

  it('closes the navigator when re-clicking the pet', () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);
    expect(screen.getByTestId('navigator')).toBeInTheDocument();

    fireEvent.pointerDown(pet);
    fireEvent.click(pet);
    expect(screen.queryByTestId('navigator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigator-sheet')).not.toBeInTheDocument();
  });

  it('closes the navigator when navigating to a destination', () => {
    renderLayout({ withPageMarker: true });

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);

    const closeLink = screen
      .getByTestId('navigator')
      .querySelector('a[href="/close"]') as HTMLAnchorElement | null;
    expect(closeLink).not.toBeNull();

    fireEvent.click(closeLink!);

    expect(screen.getByTestId('page-marker').dataset.page).toBe('/close');
    expect(screen.queryByTestId('navigator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigator-sheet')).not.toBeInTheDocument();
  });

  it('highlights the current page with the accent state in the navigator', () => {
    renderLayout({ initialRoute: '/close' });

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);

    const currentLink = screen
      .getByTestId('navigator')
      .querySelector('a[href="/close"]') as HTMLAnchorElement | null;
    expect(currentLink).not.toBeNull();
    expect(currentLink!.className).toContain('text-primary');

    const otherLink = screen
      .getByTestId('navigator')
      .querySelector('a[href="/debt"]') as HTMLAnchorElement | null;
    expect(otherLink!.className).not.toContain('text-primary');
  });

  it('exposes the navigator on mobile as a bottom sheet', async () => {
    renderLayout();

    const pet = screen.getByRole('button', { name: /pixel pet/i });
    fireEvent.pointerDown(pet);
    fireEvent.click(pet);

    const sheet = await screen.findByTestId('navigator-sheet');

    const sheetItems = Array.from(sheet.querySelectorAll('a'));
    expect(sheetItems).toHaveLength(8);
    expect(sheetItems.map((item) => item.getAttribute('href'))).toEqual(
      NAVIGATOR_ITEMS.map((item) => item.to),
    );

    const firstLink = sheet.querySelector('a');
    expect(firstLink).not.toBeNull();
    fireEvent.click(firstLink!);

    await waitFor(() => expect(screen.queryByTestId('navigator-sheet')).not.toBeInTheDocument());
  });
});
