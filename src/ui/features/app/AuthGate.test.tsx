import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';

import { AuthGate } from './AuthGate';

vi.mock('@/ui/contexts/useAuthState');

const mockAuthState = (overrides: Partial<ReturnType<typeof useAuthState>> = {}) => {
  vi.mocked(useAuthState).mockReturnValue({
    user: null,
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

  it('renders children while auth is still initializing', () => {
    // Loading no longer blocks the tree: /login must not wait for a callback that
    // does not concern it. Protected routes own their own pending surface.
    mockAuthState({ loading: true });

    renderGate();

    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  it('renders the shared fallback with a reload path when initialization fails', () => {
    // The unreachable-backend state is exactly this: the 10s timeout sets the code
    // while `loading` stays true (the auth callback never fires). The failure must
    // win over everything else.
    mockAuthState({ loading: true, initError: 'auth-backend-unreachable' });

    renderGate();

    expect(screen.getByText('Cannot reach the backend')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.queryByText('app')).toBeNull();
  });
});
