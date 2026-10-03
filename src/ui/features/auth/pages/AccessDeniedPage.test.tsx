import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';

import AccessDenied from './AccessDeniedPage';

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

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccessDenied />
    </MemoryRouter>,
  );

describe('AccessDeniedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the denial title as the unique H1', () => {
    mockAuthState();

    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Access Denied');
  });

  it('logs out when the user chooses to leave', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockAuthState({ logout });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});
