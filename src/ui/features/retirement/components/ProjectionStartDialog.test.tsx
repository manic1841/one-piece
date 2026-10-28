import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectionStartDialog } from './ProjectionStartDialog';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { uid: 'user-1', householdId: 'household-1' } }),
}));

const { planLibraryMock } = vi.hoisted(() => ({
  planLibraryMock: {
    plans: [] as Array<{
      id: string;
      name: string;
      retirementAge: number;
      lifeExpectancy: number;
      inflationRate: number;
      annualReturnRate: number;
      updatedAt: Date;
    }>,
    loading: false,
    error: null as unknown,
    refresh: vi.fn(),
  },
}));

vi.mock('@/ui/features/retirement/hooks/usePlanLibrary', () => ({
  usePlanLibrary: () => planLibraryMock,
}));

const planOption = (id: string, name: string) => ({
  id,
  name,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
});

function renderDialog() {
  const onSelectBlank = vi.fn();
  const onSelectPlan = vi.fn();
  const onCancel = vi.fn();
  render(
    <ProjectionStartDialog
      onSelectBlank={onSelectBlank}
      onSelectPlan={onSelectPlan}
      onCancel={onCancel}
    />,
  );
  return { onSelectBlank, onSelectPlan, onCancel };
}

describe('ProjectionStartDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planLibraryMock.plans = [];
    planLibraryMock.loading = false;
    planLibraryMock.error = null;
  });

  it('offers Start blank as the primary action when there are no saved plans', () => {
    const { onSelectBlank } = renderDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start a projection' })).toBeInTheDocument();
    expect(screen.getByText('No saved plans yet.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'FROM A SAVED PLAN' })).not.toBeInTheDocument();

    const startBlank = screen.getByRole('button', { name: 'Start blank' });
    expect(startBlank).toHaveClass('bg-primary');
    fireEvent.click(startBlank);
    expect(onSelectBlank).toHaveBeenCalledTimes(1);
  });

  it('places saved plans before a matching blank option without a competing primary button', () => {
    planLibraryMock.plans = [planOption('plan-1', 'Early retirement')];
    renderDialog();

    expect(screen.getByRole('heading', { name: 'FROM A SAVED PLAN' })).toBeInTheDocument();
    const [plan, blank] = screen.getAllByRole('button');
    expect(plan).toHaveTextContent('Early retirement');
    expect(blank).toHaveTextContent('Start blank');
    expect(plan.className).toBe(blank.className);
    expect(blank).not.toHaveClass('bg-primary');
  });

  it('reports the picked plan id', () => {
    planLibraryMock.plans = [planOption('plan-1', 'Early retirement')];
    const { onSelectPlan } = renderDialog();

    fireEvent.click(screen.getByTestId('plan-option-plan-1'));

    expect(onSelectPlan).toHaveBeenCalledWith('plan-1');
  });

  it('shows each plan with its assumptions and last update', () => {
    planLibraryMock.plans = [planOption('plan-1', 'Early retirement')];
    renderDialog();

    const row = screen.getByTestId('plan-option-plan-1');
    expect(row).toHaveTextContent('Retires at 60 · Lives to 85 · Inflation 2.0% · Return 5.0%');
    expect(row).toHaveTextContent('Updated 2026-03-02');
  });

  it('warns on a failed plan load and retries without blocking START BLANK', () => {
    planLibraryMock.error = new Error('boom');
    renderDialog();

    expect(screen.getByText('Could not load plans.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Start blank/ })).toBeEnabled();
    expect(screen.queryByTestId('plan-options-loading')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(planLibraryMock.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps START BLANK usable while the library loads', () => {
    planLibraryMock.loading = true;
    renderDialog();

    expect(screen.getByTestId('plan-options-loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Start blank/ })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes through the dialog close button', () => {
    const { onCancel } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
