import { type ComponentProps } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementOneTimeEvent,
  mapRetirementEventToVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { EventTabContent } from './EventTabContent';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

type EventItem = ComponentProps<typeof EventTabContent>['eventItems'][number];

const toItem = (event: RetirementOneTimeEvent): EventItem => ({
  domain: event,
  vm: mapRetirementEventToVM(event, 2),
});

const expenseEvent = (): RetirementOneTimeEvent => ({
  id: 'ev1',
  name: '購屋',
  type: 'expense',
  phases: [
    { name: '頭期款', startYear: 2026, endYear: 2026, amount: 500000 },
    { name: '', startYear: 2028, endYear: 2030, amount: 120000 },
  ],
});

const incomeEvent = (): RetirementOneTimeEvent => ({
  id: 'ev2',
  name: '租金',
  type: 'income',
  phases: [{ name: '', startYear: 2030, endYear: 2035, amount: 12000 }],
});

function renderTab(overrides: Partial<ComponentProps<typeof EventTabContent>> = {}) {
  const props: ComponentProps<typeof EventTabContent> = {
    currentYear: 2026,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    eventItems: [toItem(expenseEvent()), toItem(incomeEvent())],
    handleAddEvent: vi.fn().mockResolvedValue(undefined),
    handleUpdateEvent: vi.fn().mockResolvedValue(undefined),
    handleDeleteEvent: vi.fn().mockResolvedValue(undefined),
    handleAddPhase: vi.fn().mockResolvedValue(undefined),
    handleUpdatePhase: vi.fn().mockResolvedValue(undefined),
    handleDeletePhase: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ConfirmDialogProvider>
      <EventTabContent {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
}

describe('EventTabContent', () => {
  it('renders the five management columns', () => {
    renderTab();

    expect(screen.getByText(L.columnName)).toBeInTheDocument();
    expect(screen.getByText(L.columnType)).toBeInTheDocument();
    expect(screen.getByText(L.columnYears)).toBeInTheDocument();
    expect(screen.getByText(L.columnAmount)).toBeInTheDocument();
    expect(screen.getByText(L.columnActions)).toBeInTheDocument();
  });

  it('renders an event row with its type, years and phase-count note', () => {
    renderTab();

    const row = screen.getByTestId('event-row-ev1');
    expect(within(row).getByText('購屋')).toBeInTheDocument();
    expect(within(row).getByText(L.typeExpense)).toBeInTheDocument();
    expect(within(row).getByText('2 phases')).toBeInTheDocument();
  });

  it('renders desktop rows before the mobile list, with distinct testids', () => {
    renderTab();

    const desktop = screen.getByTestId('event-row-ev1');
    const mobile = screen.getByTestId('event-row-mobile-ev1');
    expect(desktop.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers a named Create Phase control on every row (#292 hard dependency)', () => {
    renderTab();

    expect(
      within(screen.getByTestId('event-row-ev1')).getByRole('button', { name: L.addPhaseAction }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('event-row-mobile-ev2')).getByRole('button', {
        name: L.addPhaseAction,
      }),
    ).toBeInTheDocument();
  });

  it('narrows rows through the filter strip and shows a filter-empty state', () => {
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: L.filterIncome }));

    expect(screen.queryByTestId('event-row-ev1')).not.toBeInTheDocument();
    expect(screen.getByTestId('event-row-ev2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: L.filterExpense }));
    expect(screen.getByTestId('event-row-ev1')).toBeInTheDocument();
    expect(screen.queryByTestId('event-row-ev2')).not.toBeInTheDocument();
  });

  it('renders the loaded state as a loading region', () => {
    renderTab({ loading: true, eventItems: [] });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the error state with a retry action', () => {
    const props = renderTab({ error: new Error('boom'), eventItems: [] });

    fireEvent.click(screen.getByRole('button', { name: L.retryAction }));

    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state with an Add Event action', () => {
    renderTab({ eventItems: [] });

    expect(screen.getByText(L.emptyTitle)).toBeInTheDocument();
    const addButtons = screen.getAllByRole('button', { name: L.addEventAction });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('hides a blank phase name in the expanded mobile row (no fallback)', () => {
    renderTab();

    const mobile = screen.getByTestId('event-row-mobile-ev1');
    fireEvent.click(mobile);

    // The named phase shows its subtitle; the blank phase shows none. A fallback to
    // the event name would duplicate '購屋' inside the row.
    expect(within(mobile).getByText('頭期款')).toBeInTheDocument();
    expect(within(mobile).getAllByText('購屋')).toHaveLength(1);
  });
});
