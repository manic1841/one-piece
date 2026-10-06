import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onboardUserUseCase } from '@/application/household/use_cases/onboardUserUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

import Onboarding from './OnboardingPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/application/household/use_cases/onboardUserUseCase', () => ({
  onboardUserUseCase: { execute: vi.fn() },
}));

const execute = vi.mocked(onboardUserUseCase.execute);

const mockAuthState = (overrides: Partial<ReturnType<typeof useAuthState>> = {}) => {
  vi.mocked(useAuthState).mockReturnValue({
    user: { uid: 'user-1', email: 'user@example.com' },
    userProfile: {
      id: 'user-1',
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedBy: 'user-1',
      updatedAt: new Date(),
    },
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
      <Onboarding />
    </MemoryRouter>,
  );

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue(undefined);
  });

  it('renders the page title as the unique H1', () => {
    mockAuthState();

    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create or Join Family');
  });

  it('does not call the use case when the input is empty', async () => {
    mockAuthState();

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(screen.getByText('Please enter a household name or ID')).toBeInTheDocument(),
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('submits the trimmed household input', async () => {
    mockAuthState();

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter a name to create or ID to join/), {
      target: { value: '  Smith Family  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith({
        input: 'Smith Family',
        userProfile: expect.objectContaining({ uid: 'user-1' }),
        userEmail: 'user@example.com',
        isAdmin: false,
      }),
    );
  });

  it('surfaces a use-case failure as an inline alert', async () => {
    mockAuthState();
    execute.mockRejectedValue(new Error('Household not found'));

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter a name to create or ID to join/), {
      target: { value: 'Smith Family' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Household not found'));
  });
});
