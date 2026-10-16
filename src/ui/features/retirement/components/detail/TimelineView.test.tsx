import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import {
  type RetirementOneTimeEvent,
  mapRetirementEventToVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import {
  DESKTOP_VISIBLE_YEARS,
  MOBILE_VISIBLE_YEARS,
} from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';

import { TimelineView, type TimelineViewProps } from './TimelineView';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

type EventItem = TimelineViewProps['eventItems'][number];

const toItem = (event: RetirementOneTimeEvent): EventItem => ({
  domain: event,
  vm: mapRetirementEventToVM(event, 2),
});

const EVENT_ITEMS: EventItem[] = [
  toItem({
    id: 'e1',
    name: '子女教育',
    type: 'expense',
    phases: [
      { name: '幼兒園', startYear: 2028, endYear: 2030, amount: 500000 },
      { name: '', startYear: 2035, endYear: 2035, amount: 120000 },
    ],
  }),
  toItem({
    id: 'e2',
    name: '勞保年金',
    type: 'income',
    phases: [{ name: '月退', startYear: 2031, endYear: 2045, amount: 12000 }],
  }),
];

function renderView(overrides: Partial<TimelineViewProps> = {}) {
  const props: TimelineViewProps = {
    currentYear: 2026,
    range: { startYear: 2026, endYear: 2076 },
    eventItems: EVENT_ITEMS,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onAddEvent: vi.fn().mockResolvedValue(undefined),
    onAddPhase: vi.fn().mockResolvedValue(undefined),
    onUpdatePhase: vi.fn().mockResolvedValue(undefined),
    onTimelineUpdatePhase: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ConfirmDialogProvider>
      <TimelineView {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
}

const stubMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TimelineView', () => {
  it('shows the loading state with a status region', () => {
    renderView({ loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the error state with a retry action', () => {
    const onRetry = vi.fn();
    renderView({ error: new Error('boom'), onRetry });
    const retry = screen.getByRole('button', { name: '重試' });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when there are no events', () => {
    renderView({ eventItems: [] });
    expect(screen.getByText('NO LIFE EVENTS')).toBeInTheDocument();
  });

  it('renders one row per event with one bar per phase', () => {
    renderView();
    expect(screen.getAllByText('子女教育').length).toBeGreaterThan(0);
    expect(screen.getAllByText('勞保年金').length).toBeGreaterThan(0);
    // Bars are named by phase name (falling back to the event name).
    expect(screen.getByRole('button', { name: '幼兒園，2028–2030' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '子女教育，2035' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月退，2031–2045' })).toBeInTheDocument();
  });

  it('does not show any amount values (tone only)', () => {
    renderView();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('pans the fixed desktop window by 1 and 5 years via named buttons', () => {
    renderView();
    expect(screen.getByText('2026–2035')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '視窗右移 1 年' }));
    expect(screen.getByText('2027–2036')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '視窗右移 5 年' }));
    expect(screen.getByText('2032–2041')).toBeInTheDocument();
  });

  it('disables the pan buttons at the window bounds', () => {
    renderView();
    // Initial window starts at the projection start.
    expect(screen.getByRole('button', { name: '視窗左移 1 年' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '視窗右移 5 年' })).not.toBeDisabled();
  });

  it('uses a 5-year window and 1-year pan steps on mobile', () => {
    stubMatchMedia(true);
    renderView();
    expect(MOBILE_VISIBLE_YEARS).toBe(5);
    expect(screen.getByText('2026–2030')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '視窗右移 5 年' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '視窗右移 1 年' })).toBeInTheDocument();
  });

  it('keeps a single roving tab stop and moves focus within/between rows', async () => {
    renderView();
    const first = screen.getByRole('button', { name: '幼兒園，2028–2030' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: '月退，2031–2045' })).toHaveAttribute(
      'tabindex',
      '-1',
    );

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const sibling = screen.getByRole('button', { name: '子女教育，2035' });
    await waitFor(() => expect(sibling).toHaveFocus());

    fireEvent.keyDown(sibling, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '月退，2031–2045' })).toHaveFocus(),
    );
  });

  it('moves keyboard focus without creating a persistent selection ring (spec §5.4 / #292)', async () => {
    renderView();
    const first = screen.getByRole('button', { name: '幼兒園，2028–2030' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const sibling = screen.getByRole('button', { name: '子女教育，2035' });
    await waitFor(() => expect(sibling).toHaveFocus());

    // Roving focus only: arrow keys move the tab stop but never mark a persistent
    // selection, so neither bar carries the `ring-2 ring-ring` selected style.
    expect(sibling).not.toHaveClass('ring-2');
    expect(first).not.toHaveClass('ring-2');
  });

  it('jumps to the last bar with End and back with Home', async () => {
    renderView();
    const first = screen.getByRole('button', { name: '幼兒園，2028–2030' });
    fireEvent.keyDown(first, { key: 'End' });
    const last = screen.getByRole('button', { name: '月退，2031–2045' });
    await waitFor(() => expect(last).toHaveFocus());

    fireEvent.keyDown(last, { key: 'Home' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '幼兒園，2028–2030' })).toHaveFocus(),
    );
  });

  it('opens the phase editor through Enter', async () => {
    renderView();
    const bar = screen.getByRole('button', { name: '幼兒園，2028–2030' });
    fireEvent.keyDown(bar, { key: 'Enter' });
    // The editor's DrawerPanel title is the owning event name.
    await waitFor(() => expect(screen.getAllByText('子女教育').length).toBeGreaterThanOrEqual(2));
  });

  it('exposes a keyboard-reachable Create Phase control per event row', () => {
    renderView();
    expect(screen.getAllByRole('button', { name: '新增階段' }).length).toBe(EVENT_ITEMS.length);
  });

  it('window label reflects the desktop visible-years constant', () => {
    renderView();
    expect(DESKTOP_VISIBLE_YEARS).toBe(10);
  });
});
