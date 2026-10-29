import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanCreate } from '@/ui/features/retirement/hooks/useRetirementPlanCreate';

import RetirementPlanCreatePage from './RetirementPlanCreatePage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({ codes: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useDebtAccountOptions', () => ({
  useDebtAccountOptions: () => ({ accounts: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanCreate');
// The mocked controller carries no RHF control, so the form primitives are
// replaced by plain markup: this page is the subject, not RHF.
vi.mock('@/ui/components/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  FormField: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
  TextInput: (props: Record<string, unknown>) => <input {...props} />,
}));
vi.mock('@/ui/features/retirement/components/AssumptionsSection', () => ({
  AssumptionsSection: () => <div data-testid="assumptions" />,
}));
vi.mock('@/ui/features/retirement/components/ProjectionRulesSection', () => ({
  ProjectionRulesSection: () => <div data-testid="rules" />,
}));
vi.mock('@/ui/features/retirement/components/LifeEventsSection', () => ({
  LifeEventsSection: () => <div data-testid="events" />,
}));

const mockUseAuth = vi.mocked(useAuthState);
const mockUseCreate = vi.mocked(useRetirementPlanCreate);

const draft = () => ({ values: {}, errors: {}, valid: true, setField: vi.fn() });

const controller = (rootMessage: string | null = null) => ({
  form: {
    formState: { errors: rootMessage === null ? {} : { root: { message: rootMessage } } },
    clearErrors: vi.fn(),
    isSubmitting: false,
  },
  submit: vi.fn(),
  assumptions: { ...draft(), birthYearLocked: false },
  rules: { ...draft(), rules: [], add: vi.fn() },
  events: { ...draft(), events: [], focusRequest: null },
  derived: {
    birthYear: 1990,
    lifeExpectancy: 85,
    retirementYear: 2055,
    ageRange: { min: 36, max: 85 },
    assumptionBounds: {},
    projectionStartYear: 2026,
  },
  undo: { canUndo: false, run: vi.fn(), push: vi.fn() },
  sectionState: {},
  rememberEvents: vi.fn(),
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RetirementPlanCreatePage />
    </MemoryRouter>,
  );

describe('RetirementPlanCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
  });

  it('renders the name field and the three draft sections', () => {
    mockUseCreate.mockReturnValue(controller() as never);

    renderPage();

    expect(screen.getByText('Plan name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Retire at 60')).toBeInTheDocument();
    expect(screen.getByTestId('assumptions')).toBeInTheDocument();
    expect(screen.getByTestId('rules')).toBeInTheDocument();
    expect(screen.getByTestId('events')).toBeInTheDocument();
  });

  it('submits from the header action', () => {
    const value = controller();
    mockUseCreate.mockReturnValue(value as never);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'CREATE PLAN' }));

    expect(value.submit).toHaveBeenCalled();
  });

  it('shows the root failure message', () => {
    mockUseCreate.mockReturnValue(controller('Could not create the plan.') as never);

    renderPage();

    expect(screen.getByText('Could not create the plan.')).toBeInTheDocument();
  });
});
