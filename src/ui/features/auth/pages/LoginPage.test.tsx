import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';

import Login from './LoginPage';

vi.mock('@/ui/contexts/useAuthState');

const mockAuthState = (overrides: Partial<ReturnType<typeof useAuthState>> = {}) => {
  vi.mocked(useAuthState).mockReturnValue({
    user: null,
    userProfile: null,
    profileLoading: false,
    isAdmin: false,
    loading: false,
    initError: null,
    logout: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
};

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title as the unique H1 and a Google sign-in action', () => {
    mockAuthState();

    renderLogin();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to One Piece');
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('hides the decorative Google mark from assistive tech', () => {
    mockAuthState();

    renderLogin();

    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('starts the Google sign-in flow on click', async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
    mockAuthState({ loginWithGoogle });

    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => expect(loginWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('surfaces a failed sign-in as an inline alert', async () => {
    const loginWithGoogle = vi.fn().mockRejectedValue(new Error('popup closed'));
    mockAuthState({ loginWithGoogle });

    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to log in'));
  });
});
