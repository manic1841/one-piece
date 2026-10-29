import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useRetirementPlanDetail } from '@/ui/features/retirement/hooks/useRetirementPlanDetail';
import { mapRetirementPlanToVM } from '@/ui/features/retirement/viewmodels/retirementPlan.vm';

import RetirementPlanViewPage from './RetirementPlanViewPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanAccess');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanDetail');

const mockUseAuth = vi.mocked(useAuthState);
const mockUseAccess = vi.mocked(useRetirementPlanAccess);
const mockUseDetail = vi.mocked(useRetirementPlanDetail);

const plan = {
  id: 'plan-1',
  name: 'Retire early',
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [
    {
      id: 'rule-1',
      name: 'Rent',
      ruleType: 'expense',
      enabled: true,
      method: 'inflation',
      source: { type: 'ledgerCode', id: 'expense:rent' },
      parameters: {},
      endCondition: { type: 'lifelong' },
      baselinePolicy: 'previousCompleteYear',
    },
  ],
  lifeEvents: [
    {
      id: 'event-1',
      name: 'Travel',
      type: 'expense',
      enabled: true,
      phases: [{ name: 'Early retirement', startYear: 2050, endYear: 2052, amount: 120_000 }],
    },
  ],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-02'),
};

const NAMES = {
  ledger: new Map([['expense:rent', 'Rent']]),
  debt: new Map<string, string>(),
};
const vmOf = (source: typeof plan) => mapRetirementPlanToVM(source as never, NAMES, 2026);

const detail = (overrides: Record<string, unknown> = {}) => ({
  vm: vmOf(plan),
  loading: false,
  errorMessage: null,
  notFound: false,
  reload: vi.fn(),
  rename: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RetirementPlanViewPage />
    </MemoryRouter>,
  );

describe('RetirementPlanViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
    mockUseAccess.mockReturnValue({ canManage: true, loading: false });
    mockUseDetail.mockReturnValue(detail() as never);
  });

  it('renders the scenario, assumptions, rules and event timeline', () => {
    renderPage();

    expect(screen.getByText('SCENARIO')).toBeInTheDocument();
    expect(screen.getByText('2050')).toBeInTheDocument();
    expect(screen.getByText('ASSUMPTIONS')).toBeInTheDocument();
    expect(screen.getByText('PROJECTION RULES')).toBeInTheDocument();
    expect(screen.getAllByText('LIFE EVENTS').length).toBeGreaterThan(0);

    expect(screen.getByText('Birth year')).toBeInTheDocument();
    expect(screen.getByText('1990')).toBeInTheDocument();
    expect(screen.getAllByTestId('plan-rule')).toHaveLength(1);
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('2050–2052')).toBeInTheDocument();

    // Phase detail stays behind the event row.
    expect(screen.queryByText(/120,000/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Travel/ }));
    expect(screen.getByText(/120,000/)).toBeInTheDocument();

    // Only the title is editable, and only in edit mode.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Last updated: 2026-03-02')).toBeInTheDocument();
  });

  it('renames through the inline title', async () => {
    const rename = vi.fn().mockResolvedValue(true);
    mockUseDetail.mockReturnValue(detail({ rename }) as never);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename' }), {
      target: { value: 'New plan name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await waitFor(() => expect(rename).toHaveBeenCalledWith('New plan name'));
  });

  it('opens the danger zone delete flow', () => {
    const remove = vi.fn().mockResolvedValue(true);
    mockUseDetail.mockReturnValue(detail({ remove }) as never);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'DELETE PLAN' }));
    expect(remove).toHaveBeenCalled();
  });

  it('disables rename, hides delete and edit without management permission', () => {
    mockUseAccess.mockReturnValue({ canManage: false, loading: false });

    renderPage();

    expect(screen.getByRole('button', { name: 'Edit name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'DELETE PLAN' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /USE THIS PLAN/ })).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockUseDetail.mockReturnValue(detail({ loading: true, vm: null }) as never);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('ASSUMPTIONS')).not.toBeInTheDocument();
  });

  it('shows a load error with retry', () => {
    const reload = vi.fn();
    mockUseDetail.mockReturnValue(
      detail({ vm: null, errorMessage: new Error('boom'), reload }) as never,
    );

    renderPage();

    expect(screen.getByText('Could not load this plan.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(reload).toHaveBeenCalled();
  });

  it('shows the not-found state with a way back to the list', () => {
    mockUseDetail.mockReturnValue(detail({ vm: null, notFound: true }) as never);

    renderPage();

    expect(screen.getByText('PLAN NOT FOUND')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to plans' })).toBeInTheDocument();
  });
});
