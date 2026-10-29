import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanEdit } from '@/ui/features/retirement/hooks/useRetirementPlanEdit';
import {
  planFormController,
  renderInRouter,
} from '@/ui/features/retirement/testing/planFormFixture';

import RetirementPlanEditPage from './RetirementPlanEditPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({ codes: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useDebtAccountOptions', () => ({
  useDebtAccountOptions: () => ({ accounts: [] }),
}));
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanEdit');
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
const mockUseEdit = vi.mocked(useRetirementPlanEdit);

const controller = (overrides: Record<string, unknown> = {}) =>
  planFormController({
    canManage: true,
    loading: false,
    errorMessage: null,
    notFound: false,
    backTo: '/retirement/plans/plan-1',
    reload: vi.fn(),
    ...overrides,
  });

const renderPage = () => renderInRouter(<RetirementPlanEditPage />);

describe('RetirementPlanEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userProfile: { householdId: 'h1' } } as never);
  });

  it('renders the form for an existing plan', () => {
    mockUseEdit.mockReturnValue(controller() as never);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Edit plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE CHANGES' })).toBeInTheDocument();
    expect(screen.getByTestId('assumptions')).toBeInTheDocument();
    expect(screen.getByTestId('rules')).toBeInTheDocument();
    expect(screen.getByTestId('events')).toBeInTheDocument();
  });

  it('submits from the header action', () => {
    const submit = vi.fn();
    mockUseEdit.mockReturnValue(controller({ submit }) as never);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE CHANGES' }));
    expect(submit).toHaveBeenCalled();
  });

  it('shows the not-found state with a way back to the list', () => {
    mockUseEdit.mockReturnValue(controller({ notFound: true }) as never);
    renderPage();

    expect(screen.getByText('PLAN NOT FOUND')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to plans' })).toBeInTheDocument();
  });

  it('shows a load error with retry', () => {
    const reload = vi.fn();
    mockUseEdit.mockReturnValue(controller({ errorMessage: 'boom', reload }) as never);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(reload).toHaveBeenCalled();
  });

  it('drops the save action for a household manager-less viewer', () => {
    mockUseEdit.mockReturnValue(controller({ canManage: false }) as never);
    renderPage();

    expect(screen.queryByRole('button', { name: 'SAVE CHANGES' })).not.toBeInTheDocument();
    expect(screen.getByTestId('assumptions')).toBeInTheDocument();
  });
});
