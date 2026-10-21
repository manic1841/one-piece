import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanAccess } from '@/ui/features/retirement-redesign/hooks/useRetirementPlanAccess';
import { useRetirementPlanDetail } from '@/ui/features/retirement-redesign/hooks/useRetirementPlanDetail';

import RetirementPlanViewPage from './RetirementPlanViewPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/retirement-redesign/hooks/useRetirementPlanAccess');
vi.mock('@/ui/features/retirement-redesign/hooks/useRetirementPlanDetail');

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

const detail = (overrides: Record<string, unknown> = {}) => ({
  plan,
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

  it('renders the three groups as read-only definition lists', () => {
    renderPage();

    expect(screen.getByText('ASSUMPTIONS')).toBeInTheDocument();
    expect(screen.getByText('PROJECTION RULES')).toBeInTheDocument();
    expect(screen.getByText('LIFE EVENTS')).toBeInTheDocument();

    expect(screen.getByText('Birth year')).toBeInTheDocument();
    expect(screen.getByText('1990')).toBeInTheDocument();
    expect(screen.getByText(/Growth rate \(%\)/)).toBeInTheDocument();
    expect(screen.getByText('Inflation')).toBeInTheDocument();
    expect(screen.getByText('Ledger code: expense:rent')).toBeInTheDocument();
    expect(screen.getByText('Lifelong')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Early retirement')).toBeInTheDocument();

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

  it('disables rename and hides delete without management permission', () => {
    mockUseAccess.mockReturnValue({ canManage: false, loading: false });

    renderPage();

    expect(screen.getByRole('button', { name: 'Edit name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'DELETE PLAN' })).not.toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockUseDetail.mockReturnValue(detail({ loading: true, plan: null }) as never);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('ASSUMPTIONS')).not.toBeInTheDocument();
  });

  it('shows a load error with retry', () => {
    const reload = vi.fn();
    mockUseDetail.mockReturnValue(
      detail({ plan: null, errorMessage: new Error('boom'), reload }) as never,
    );

    renderPage();

    expect(screen.getByText('Could not load this plan.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(reload).toHaveBeenCalled();
  });

  it('shows the not-found state with a way back to the list', () => {
    mockUseDetail.mockReturnValue(detail({ plan: null, notFound: true }) as never);

    renderPage();

    expect(screen.getByText('PLAN NOT FOUND')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to plans' })).toBeInTheDocument();
  });
});
