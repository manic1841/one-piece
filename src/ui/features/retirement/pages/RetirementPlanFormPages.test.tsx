import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { usePlanForm } from '@/ui/features/retirement/hooks/usePlanForm';
import {
  planFormController,
  renderInRouter,
} from '@/ui/features/retirement/testing/planFormFixture';

import RetirementPlanCreatePage from './RetirementPlanCreatePage';
import RetirementPlanEditPage from './RetirementPlanEditPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({ codes: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useDebtAccountOptions', () => ({
  useDebtAccountOptions: () => ({ accounts: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanCmds', () => ({
  useRetirementPlanCmds: () => ({ createPlan: vi.fn(), updatePlan: vi.fn() }),
}));
vi.mock('@/ui/features/retirement/hooks/usePlanForm');
// The mocked controller carries no RHF control, so the form primitives are
// replaced by plain markup: these pages are the subject, not RHF.
vi.mock('@/ui/components/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  FormField: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
  formMessageClass: 'text-destructive',
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
const mockUseForm = vi.mocked(usePlanForm);

const controller = (overrides: Record<string, unknown> = {}) =>
  planFormController({
    readOnly: false,
    loading: false,
    errorMessage: null,
    notFound: false,
    back: '/retirement/plans/plan-1',
    reload: vi.fn(),
    ...overrides,
  });

const PAGES = [
  {
    name: 'create',
    Page: RetirementPlanCreatePage,
    action: 'CREATE PLAN',
    heading: 'New plan',
  },
  {
    name: 'edit',
    Page: RetirementPlanEditPage,
    action: 'SAVE CHANGES',
    heading: 'Edit plan',
  },
] as const;

describe.each(PAGES)('$name plan page', ({ Page, action, heading }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
    mockUseForm.mockReturnValue(controller() as never);
  });

  it('renders the name field and the three draft sections', () => {
    renderInRouter(<Page />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Retire at 60')).toBeInTheDocument();
    expect(screen.getByTestId('assumptions')).toBeInTheDocument();
    expect(screen.getByTestId('rules')).toBeInTheDocument();
    expect(screen.getByTestId('events')).toBeInTheDocument();
  });

  it('submits from the header action', () => {
    const submit = vi.fn();
    mockUseForm.mockReturnValue(controller({ submit }) as never);

    renderInRouter(<Page />);
    fireEvent.click(screen.getByRole('button', { name: action }));

    expect(submit).toHaveBeenCalled();
  });

  it('shows the root failure message', () => {
    mockUseForm.mockReturnValue(
      controller({
        form: { formState: { errors: { root: { message: 'Could not save.' } } } },
      }) as never,
    );

    renderInRouter(<Page />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });

  it('drops the write action for a household manager-less viewer', () => {
    mockUseForm.mockReturnValue(controller({ readOnly: true }) as never);

    renderInRouter(<Page />);

    expect(screen.queryByRole('button', { name: action })).not.toBeInTheDocument();
    expect(screen.getByTestId('assumptions')).toBeInTheDocument();
  });
});

describe('edit page states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
  });

  it('renders nothing but the skeleton while loading', () => {
    mockUseForm.mockReturnValue(controller({ loading: true }) as never);

    renderInRouter(<RetirementPlanEditPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('assumptions')).not.toBeInTheDocument();
  });

  it('shows the not-found state with a way back to the list', () => {
    mockUseForm.mockReturnValue(controller({ notFound: true }) as never);

    renderInRouter(<RetirementPlanEditPage />);

    expect(screen.getByText('PLAN NOT FOUND')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to plans' })).toBeInTheDocument();
  });

  it('shows a load error with retry', () => {
    const reload = vi.fn();
    mockUseForm.mockReturnValue(controller({ errorMessage: 'boom', reload }) as never);

    renderInRouter(<RetirementPlanEditPage />);
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));

    expect(reload).toHaveBeenCalled();
  });
});
