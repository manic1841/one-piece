import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRetirementPlanListPage } from '@/ui/features/retirement/hooks/useRetirementPlanListPage';
import { type RetirementPlanListItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementPlanList from './RetirementPlanList';

vi.mock('@/ui/features/retirement/hooks/useRetirementPlanListPage');

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
    statusText: '使用中',
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
    createPlan: vi.fn().mockResolvedValue(undefined),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    duplicatePlan: vi.fn().mockResolvedValue(undefined),
    setActivePlan: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
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
    expect(screen.getAllByText('Test Plan').length).toBeGreaterThan(0);
  });

  it('renders plan rows without per-plan cards', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    expect(screen.getByTestId('retirement-plan-row-plan-1')).toBeInTheDocument();
    expect(document.querySelector('.rounded-lg.border.bg-card')).toBeNull();
    expect(screen.queryByText('Retire in 2050')).not.toBeInTheDocument();
    expect(screen.queryByText('5% Return')).not.toBeInTheDocument();
  });

  it('marks the active plan with a primary bar and a text badge', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    const row = screen.getByTestId('retirement-plan-row-plan-1');
    expect(row.className.includes('border-l-primary')).toBe(true);
    expect(screen.getAllByText('使用中').length).toBeGreaterThan(0);
  });

  it('places the active plan before inactive plans', () => {
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({
        planItems: [
          planItemFixture({ id: 'plan-active', name: 'Active Plan', isActive: true }),
          planItemFixture({
            id: 'plan-idle',
            name: 'Idle Plan',
            isActive: false,
            statusText: '未使用',
          }),
        ],
      }),
    );

    renderList();

    const table = screen.getByRole('table');
    const active = table.querySelector('[data-testid="retirement-plan-row-plan-active"]');
    const idle = table.querySelector('[data-testid="retirement-plan-row-plan-idle"]');
    expect(active).not.toBeNull();
    expect(idle).not.toBeNull();
    expect(Boolean(active!.compareDocumentPosition(idle!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );
  });

  it('renders the desktop table before the mobile list in the DOM', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    const table = screen.getByTestId('retirement-plan-table');
    const mobileRow = screen.getByTestId('retirement-plan-row-mobile-plan-1');
    expect(
      Boolean(table.compareDocumentPosition(mobileRow) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('navigates to plan detail on row click', () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    fireEvent.click(screen.getByTestId('retirement-plan-row-plan-1'));
    expect(navigate).toHaveBeenCalledWith('/retirement/plan-1');
  });

  it('keeps New Plan in the header and demotes duplicate to a row-end icon action', () => {
    const duplicatePlan = vi.fn().mockResolvedValue(undefined);
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture({ duplicatePlan }));

    renderList();

    const newPlanButton = screen.getByRole('button', { name: /New Plan/i });
    expect(newPlanButton).toBeInTheDocument();
    expect(
      newPlanButton.compareDocumentPosition(screen.getByRole('table')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const duplicateAction = screen.getByRole('button', { name: 'Duplicate plan' });
    expect(duplicateAction.textContent).toBe('');
    fireEvent.click(duplicateAction);
    expect(duplicatePlan).toHaveBeenCalledWith('plan-1');
  });

  it('activates an inactive plan from its row-action icon', () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    const setActivePlan = vi.fn().mockResolvedValue(undefined);
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({
        setActivePlan,
        planItems: [planItemFixture({ isActive: false, statusText: '未使用' })],
      }),
    );

    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Set as active' }));
    expect(setActivePlan).toHaveBeenCalledWith('plan-1');
    expect(navigate).not.toHaveBeenCalledWith('/retirement/plan-1');
  });

  it('hides the activate action for the already-active plan', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    expect(screen.queryByRole('button', { name: 'Set as active' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Duplicate plan' })).toBeInTheDocument();
  });

  it('does not navigate when the duplicate action is clicked', () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ duplicatePlan: vi.fn().mockResolvedValue(undefined) }),
    );

    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate plan' }));
    expect(navigate).not.toHaveBeenCalledWith('/retirement/plan-1');
  });

  it('renders compact mobile rows that keep every column value', () => {
    mockUseRetirementPlanListPage.mockReturnValue(controllerFixture());

    renderList();

    const row = screen.getByTestId('retirement-plan-row-mobile-plan-1');
    expect(row.textContent).toContain('Test Plan');
    expect(row.textContent).toContain('Retirement Age');
    expect(row.textContent).toContain('60');
    expect(row.textContent).toContain('Final Net Worth');
    expect(row.textContent).toContain('NT$300,000');
    expect(row.textContent).toContain('使用中');
  });

  it('shows the empty state with a create call to action', () => {
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ planItems: [], mutating: false }),
    );

    renderList();

    expect(screen.getByText('NO PLANS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Plan/i })).toBeInTheDocument();
  });

  it('shows an actionable error state with retry', () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    mockUseRetirementPlanListPage.mockReturnValue(
      controllerFixture({ error: new Error('boom'), reload }),
    );

    renderList();

    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    expect(reload).toHaveBeenCalled();
  });
});
