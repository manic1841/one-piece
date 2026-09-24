import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRetirementPlanListPage } from '@/ui/features/retirement/hooks/useRetirementPlanListPage';
import { type RetirementPlanListItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

vi.mock('@/ui/features/retirement/hooks/useRetirementPlanListPage');

import RetirementPlanList from './RetirementPlanList';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      householdId: 'household-1',
      isGlobalAdmin: false,
    },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockUseRetirementPlanListPage = vi.mocked(useRetirementPlanListPage);
const mockUseNavigate = vi.mocked(useNavigate);

function planItemFixture(
  overrides: Partial<RetirementPlanListItemVM> = {},
): RetirementPlanListItemVM {
  return {
    id: 'plan-1',
    name: 'Test Plan',
    isActive: true,
    retirementAge: 60,
    statusText: 'Active',
    finalNetWorthText: 'NT$300,000',
    ...overrides,
  };
}

function controllerFixture(
  overrides: Partial<ReturnType<typeof useRetirementPlanListPage>> = {},
): ReturnType<typeof useRetirementPlanListPage> {
  return {
    plans: [],
    planItems: [planItemFixture()],
    listPlans: vi.fn().mockResolvedValue([]),
    loading: false,
    error: null,
    mutating: false,
    createPlan: vi.fn().mockResolvedValue('plan-2'),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    duplicatePlan: vi.fn().mockResolvedValue('plan-3'),
    reload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as ReturnType<typeof useRetirementPlanListPage>;
}

function renderList() {
  return render(
    <MemoryRouter>
      <RetirementPlanList />
    </MemoryRouter>,
  );
}

describe('RetirementPlanList table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(vi.fn());
  });

  it('renders Name / Retirement Age / Final Net Worth / Status columns', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Retirement Age' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Final Net Worth' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('Test Plan')).toBeInTheDocument();
  });

  it('renders plan rows without per-plan cards', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    expect(screen.getByTestId('retirement-plan-row-plan-1')).toBeInTheDocument();
    expect(document.querySelector('.rounded-lg.border.bg-card')).toBeNull();
    expect(screen.queryByText('Retire in 2050')).not.toBeInTheDocument();
    expect(screen.queryByText('5% Return')).not.toBeInTheDocument();
  });

  it('navigates to plan detail on row click', () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    fireEvent.click(screen.getByText('Test Plan'));
    expect(navigate).toHaveBeenCalledWith('/retirement/plan-1');
  });

  it('keeps New Plan in the header and demotes duplicate to a row-end icon action', () => {
    const duplicatePlan = vi.fn().mockResolvedValue('plan-3');
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ duplicatePlan }),
    );

    renderList();

    const newPlanButton = screen.getByRole('button', { name: /New Plan/i });
    expect(newPlanButton).toBeInTheDocument();
    expect(
      newPlanButton.compareDocumentPosition(screen.getByRole('table')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Duplicate', exact: true })).not.toBeInTheDocument();

    const duplicateAction = screen.getByRole('button', { name: 'Duplicate plan' });
    expect(duplicateAction.textContent).toBe('');
    fireEvent.click(duplicateAction);
    expect(duplicatePlan).toHaveBeenCalledWith('plan-1');
  });

  it('does not navigate when the duplicate action is clicked', () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ duplicatePlan: vi.fn().mockResolvedValue('plan-3') }),
    );

    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate plan' }));
    expect(navigate).not.toHaveBeenCalledWith('/retirement/plan-1');
  });

  it('renders compact mobile rows that keep every column value', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    const row = screen.getByTestId('retirement-plan-row-plan-1');
    expect(row).toHaveTextContent('Test Plan');
    expect(row).toHaveTextContent('Retirement Age');
    expect(row).toHaveTextContent('60');
    expect(row).toHaveTextContent('Final Net Worth');
    expect(row).toHaveTextContent('NT$300,000');
    expect(row).toHaveTextContent('Active');
  });

  it('shows the empty state with a create call to action', () => {
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ planItems: [], mutating: false }),
    );

    renderList();

    expect(screen.getByText('No plans yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Plan/i })).toBeInTheDocument();
  });
});
