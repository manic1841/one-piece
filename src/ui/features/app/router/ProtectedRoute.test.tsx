import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/features/app/hooks/useRouteAuthorization', () => ({
  useRouteAuthorization: vi.fn(),
}));

import { useRouteAuthorization } from '@/ui/features/app/hooks/useRouteAuthorization';

import ProtectedRoute from './ProtectedRoute';

const renderAt = (outcome: string) => {
  vi.mocked(useRouteAuthorization).mockReturnValue({
    outcome: outcome as ReturnType<typeof useRouteAuthorization>['outcome'],
  });

  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>SECRET</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/access-denied" element={<div>ACCESS DENIED PAGE</div>} />
        <Route path="/onboarding" element={<div>ONBOARDING PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when the workflow allows access', () => {
    renderAt('allow');
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('shows a loading state while the decision is pending', () => {
    renderAt('pending');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
  });

  it('redirects a signed-out visitor to login', () => {
    renderAt('unauthenticated');
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects an unauthorized user to access-denied', () => {
    renderAt('access-denied');
    expect(screen.getByText('ACCESS DENIED PAGE')).toBeInTheDocument();
  });

  it('redirects a user without a household to onboarding', () => {
    renderAt('onboarding');
    expect(screen.getByText('ONBOARDING PAGE')).toBeInTheDocument();
  });
});
