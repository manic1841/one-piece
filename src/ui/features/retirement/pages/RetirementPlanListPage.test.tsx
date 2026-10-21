import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanList } from '@/ui/features/retirement/hooks/useRetirementPlanList';

import RetirementPlanListPage from './RetirementPlanListPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanList');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuthState);
const mockUseList = vi.mocked(useRetirementPlanList);
const mockNavigate = vi.mocked(useNavigate);

const plan = (id: string, name: string, updatedAt: string) => ({
  id,
  name,
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date(updatedAt),
});

const list = (overrides: Record<string, unknown> = {}) => ({
  plans: [],
  loading: false,
  errorMessage: null,
  reload: vi.fn(),
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RetirementPlanListPage />
    </MemoryRouter>,
  );

describe('RetirementPlanListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
    mockNavigate.mockReturnValue(vi.fn());
  });

  it('renders name and last-updated columns in the returned order', () => {
    mockUseList.mockReturnValue(
      list({ plans: [plan('p1', 'First', '2026-03-02'), plan('p2', 'Second', '2026-03-01')] }),
    );

    renderPage();

    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Last updated').length).toBeGreaterThan(0);

    const first = screen.getByTestId('plan-row-p1');
    const second = screen.getByTestId('plan-row-p2');
    expect(first.textContent).toContain('First');
    expect(first.textContent).toContain('2026-03-02');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the mobile row with the same data', () => {
    mockUseList.mockReturnValue(list({ plans: [plan('p1', 'First', '2026-03-02')] }));

    renderPage();

    const mobile = screen.getByTestId('plan-row-mobile-p1');
    expect(mobile.textContent).toContain('First');
    expect(mobile.textContent).toContain('2026-03-02');
    expect(mobile).toHaveAttribute('role', 'button');
  });

  it('navigates to the plan view when a row is clicked or activated by keyboard', () => {
    const navigate = vi.fn();
    mockNavigate.mockReturnValue(navigate);
    mockUseList.mockReturnValue(list({ plans: [plan('p1', 'First', '2026-03-02')] }));

    renderPage();

    fireEvent.click(screen.getByTestId('plan-row-p1'));
    expect(navigate).toHaveBeenCalledWith('/retirement/plans/p1');

    fireEvent.keyDown(screen.getByTestId('plan-row-mobile-p1'), { key: ' ' });
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('renders a one-sentence empty state with a CTA', () => {
    mockUseList.mockReturnValue(list());

    renderPage();

    expect(
      screen.getByText('No plans have been saved yet. Build a projection and save it as a plan.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /NEW PLAN/ })).toHaveLength(2);
  });

  it('renders a loading skeleton and hides empty and error states', () => {
    mockUseList.mockReturnValue(list({ loading: true, errorMessage: new Error('boom') }));

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('NO PLANS')).not.toBeInTheDocument();
    expect(screen.queryByText('Could not load plans.')).not.toBeInTheDocument();
  });

  it('renders a load error with retry', () => {
    const reload = vi.fn();
    mockUseList.mockReturnValue(list({ errorMessage: new Error('boom'), reload }));

    renderPage();

    expect(screen.getByText('Could not load plans.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(reload).toHaveBeenCalled();
  });

  it('navigates to the workspace from the header create action', () => {
    const navigate = vi.fn();
    mockNavigate.mockReturnValue(navigate);
    mockUseList.mockReturnValue(list());

    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: /NEW PLAN/ })[0]);
    expect(navigate).toHaveBeenCalledWith('/retirement/new');
  });
});
