import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/infra/contexts/useAuth';

vi.mock('@/infra/contexts/useAuth');

import { AuthGate } from './AuthGate';

const mockAuthState = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    currentUser: null,
    userProfile: null,
    isAdmin: false,
    loading: false,
    initError: null,
    logout: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
};

const renderGate = () =>
  render(
    <AuthGate>
      <div>app</div>
    </AuthGate>,
  );

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children once auth initialization settles', () => {
    mockAuthState({ loading: false });

    renderGate();

    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('renders nothing while auth is still initializing', () => {
    mockAuthState({ loading: true });

    renderGate();

    expect(screen.queryByText('app')).toBeNull();
  });

  it('renders the shared fallback with a reload path when initialization fails', () => {
    // The unreachable-backend state is exactly this: the 10s timeout sets the code
    // while `loading` stays true (the auth callback never fires). The failure must
    // win over the loading branch.
    mockAuthState({ loading: true, initError: 'auth-backend-unreachable' });

    renderGate();

    expect(screen.getByText('Cannot reach the backend')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.queryByText('app')).toBeNull();
  });
});
