import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { ClosePeriodRouteGate } from './ClosePeriodRouteGate';

const { authState } = vi.hoisted(() => ({
  authState: { userProfile: { householdId: 'household-1', email: 'user@test.com' } },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => authState,
}));

// The workspace has its own tests; this file only covers the route's decision.
vi.mock('./MonthlyClosePage', () => ({
  MonthlyClosePage: ({ yearMonth }: { yearMonth: string }) => (
    <div data-testid="workspace">{yearMonth}</div>
  ),
}));

const periodFixture = {
  id: '2026-09',
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: {},
  reviewSourceStageId: null,
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/close" element={<div data-testid="picker" />} />
        <Route path="/close/:yearMonth" element={<ClosePeriodRouteGate />} />
      </Routes>
    </MemoryRouter>,
  );

const executeSpy = () => vi.spyOn(GetFinancialPeriodUseCase.prototype, 'execute');

describe('ClosePeriodRouteGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the workspace for a period that exists', async () => {
    executeSpy().mockResolvedValue(periodFixture as never);

    renderAt('/close/2026-09');

    expect(await screen.findByTestId('workspace')).toHaveTextContent('2026-09');
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('reads the period for the param month', async () => {
    const execute = executeSpy().mockResolvedValue(periodFixture as never);

    renderAt('/close/2026-09');

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenCalledWith({ householdId: 'household-1', yearMonth: '2026-09' });
  });

  it('shows the loading state until the read settles', () => {
    executeSpy().mockReturnValue(new Promise(() => {}) as never);

    renderAt('/close/2026-09');

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
  });

  it('returns to the picker for a malformed param, without reading', async () => {
    const execute = executeSpy().mockResolvedValue(periodFixture as never);

    renderAt('/close/abc');

    expect(await screen.findByTestId('picker')).toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns to the picker for an out-of-range month, without reading', async () => {
    const execute = executeSpy().mockResolvedValue(periodFixture as never);

    renderAt('/close/2026-13');

    expect(await screen.findByTestId('picker')).toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns to the picker when the period record does not exist', async () => {
    executeSpy().mockResolvedValue(null as never);

    renderAt('/close/2026-09');

    expect(await screen.findByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
  });

  it('shows the read failure instead of redirecting (ADR-0072)', async () => {
    executeSpy().mockRejectedValue(new Error('boom'));

    renderAt('/close/2026-09');

    expect(await screen.findByText(MONTHLY_CLOSE_LABELS.LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
  });
});
