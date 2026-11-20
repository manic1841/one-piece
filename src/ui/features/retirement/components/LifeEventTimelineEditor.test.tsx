import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type LifeEventDraftVM } from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

import { LifeEventTimelineEditor, type TimelineSelection } from './LifeEventTimelineEditor';

const START = 2026;
const WINDOW_WIDTH = 500;

function phase(id: string, name: string, startYear: number, endYear: number) {
  return {
    id,
    name,
    startYearText: String(startYear),
    endYearText: String(endYear),
    amountText: '100',
    growthRateText: '',
    touched: true,
  };
}

function event(id: string, name: string, phases: ReturnType<typeof phase>[]): LifeEventDraftVM {
  return { id, name, type: 'income', enabled: true, phases, touched: true };
}

const events: LifeEventDraftVM[] = [
  event('event-1', 'Travel', [phase('phase-1', 'Phase 1', 2028, 2029)]),
  event('event-2', 'Rent', [phase('phase-2', 'Phase 1', 2030, 2031)]),
];

interface Handlers {
  onSelect: ReturnType<typeof vi.fn>;
  onCreate: ReturnType<typeof vi.fn>;
  onGestureStart: ReturnType<typeof vi.fn>;
  onRangeChange: ReturnType<typeof vi.fn>;
}

function renderEditor(overrides: Partial<{ readOnly: boolean; events: LifeEventDraftVM[] }> = {}) {
  const handlers: Handlers = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onGestureStart: vi.fn(),
    onRangeChange: vi.fn(),
  };
  const result = render(
    <LifeEventTimelineEditor
      events={overrides.events ?? events}
      readOnly={overrides.readOnly ?? false}
      projectionStartYear={START}
      birthYear={1990}
      lifeExpectancy={90}
      retirementYear={2050}
      selection={null as TimelineSelection | null}
      revealYear={null}
      onSelect={handlers.onSelect}
      onCreate={handlers.onCreate}
      onGestureStart={handlers.onGestureStart}
      onRangeChange={handlers.onRangeChange}
    />,
  );

  const track = screen.getByRole('toolbar', { name: 'Life event timeline' });
  const rows = screen.getByTestId('timeline-rows');
  // The plot area is the first child overlay; the name gutter is not a year.
  const plot = track.firstElementChild;
  if (!(plot instanceof HTMLElement)) throw new Error('plot area missing');

  // The geometry is measured from these rects; jsdom reports zeroes. The drag
  // threshold is in pixels of `clientWidth`, which jsdom also leaves at 0.
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(rect(0, 0, WINDOW_WIDTH, 100));
  vi.spyOn(rows, 'getBoundingClientRect').mockReturnValue(rect(0, 0, WINDOW_WIDTH, 92));
  Object.defineProperty(plot, 'clientWidth', { value: WINDOW_WIDTH, configurable: true });

  return { ...result, ...handlers, track, rows };
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** One year is `WINDOW_WIDTH / 10` px wide, so `years` converts to a delta. */
const yearWidth = () => WINDOW_WIDTH / 10;

/**
 * Drags from `handle`: the press lands on the element under the pointer, the
 * moves go to the track because the pointer is captured to it.
 */
function drag(
  track: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 4,
  handle: HTMLElement = track,
) {
  fireEvent.pointerDown(handle, { clientX: from.x, clientY: from.y, pointerId: 1 });
  for (let step = 1; step <= steps; step += 1) {
    fireEvent.pointerMove(track, {
      clientX: from.x + ((to.x - from.x) * step) / steps,
      clientY: from.y + ((to.y - from.y) * step) / steps,
      pointerId: 1,
    });
  }
  fireEvent.pointerUp(track, { clientX: to.x, clientY: to.y, pointerId: 1 });
}

/** Bar centre: event 0 starts at 2028, i.e. two years into the window. */
function barPoint(rowIndex: number) {
  return { x: yearWidth() * 2 + 5, y: rowIndex * 48 + 24 };
}

function barAt(index: number): HTMLElement {
  return screen.getAllByRole('button', { name: /，/ })[index];
}

describe('LifeEventTimelineEditor', () => {
  it('draws one bar per phase, named and toned by its event', () => {
    renderEditor();

    const bars = screen.getAllByRole('button', { name: /，/ });
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAccessibleName('Phase 1，2028–2029');
    expect(bars[0].className).toContain('border-positive/70');
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('tones expense phases with the negative colour', () => {
    renderEditor({ events: [{ ...events[0], type: 'expense' }] });

    expect(screen.getByRole('button', { name: /，/ }).className).toContain('border-negative/70');
  });

  it('selects a phase on a press without movement', () => {
    const { track, onSelect, onGestureStart } = renderEditor();
    const point = barPoint(0);
    const bar = screen.getAllByRole('button', { name: /，/ })[0];

    drag(track, point, point, 1, bar);

    expect(onSelect).toHaveBeenCalledWith({ eventId: 'event-1', phaseId: 'phase-1' });
    expect(onGestureStart).not.toHaveBeenCalled();
  });

  it('moves the phase by whole years once the drag passes the threshold', () => {
    const { track, onRangeChange, onGestureStart } = renderEditor();
    const from = barPoint(0);

    drag(track, from, { x: from.x + yearWidth() * 2, y: from.y }, 4, barAt(0));

    expect(onGestureStart).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenLastCalledWith('phase-1', 'event-1', 2030, 2031);
  });

  it('reparents onto the row under the pointer', () => {
    const { track, onRangeChange } = renderEditor();
    const from = barPoint(0);

    drag(track, from, { x: from.x + yearWidth(), y: barPoint(1).y }, 4, barAt(0));

    expect(onRangeChange).toHaveBeenLastCalledWith('phase-1', 'event-2', 2029, 2030);
  });

  it('resizes from the edge without moving the other end', () => {
    const { track, onRangeChange } = renderEditor();
    const bar = barAt(0);
    const handle = bar.lastElementChild;
    expect(handle).not.toBeNull();
    if (handle === null) return;

    // The end handle sits 2px inside the right edge of the two-year bar.
    const from = { x: yearWidth() * 2 + yearWidth() * 2 - 2, y: barPoint(0).y };
    fireEvent.pointerDown(handle, { clientX: from.x, clientY: from.y, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: from.x + yearWidth(), clientY: from.y, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: from.x + yearWidth(), clientY: from.y, pointerId: 1 });

    expect(onRangeChange).toHaveBeenLastCalledWith('phase-1', 'event-1', 2028, 2030);
  });

  it('creates a phase on the empty years under the pointer', () => {
    const { track, onCreate } = renderEditor();

    // Press and release on the track itself, away from every bar.
    drag(track, { x: 260, y: barPoint(0).y }, { x: 360, y: barPoint(0).y }, 2);

    expect(onCreate).toHaveBeenCalledTimes(1);
    const [start, end] = onCreate.mock.calls[0];
    expect(end).toBeGreaterThan(start);
  });

  it('creates in the row that was pressed, not in the selected one', () => {
    const { track, onCreate } = renderEditor();

    // Row 1 is the second event; the selection is irrelevant to a background press.
    drag(track, { x: 260, y: barPoint(1).y }, { x: 360, y: barPoint(1).y }, 2);

    expect(onCreate).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), 'event-2');
  });

  it('marks a bar that runs past both window edges as cut', () => {
    renderEditor({ events: [event('event-1', 'Travel', [phase('phase-1', 'Long', 2020, 2040)])] });

    const bar = screen.getByRole('button', { name: /，/ });
    expect(bar.className).toContain('border-l-dashed');
    expect(bar.className).toContain('border-r-dashed');
    expect(bar.className).toContain('rounded-l-none');
  });

  it('disables a pan button that cannot move further', () => {
    renderEditor();

    // The window already starts at the projection start.
    expect(screen.getByRole('button', { name: 'Pan 1 year back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pan 1 year forward' })).toBeEnabled();
  });

  it('pans the window with the buttons', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Pan 1 year forward' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pan 1 year back' })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: 'Pan 1 year forward' })).toHaveAccessibleName(
      'Pan 1 year forward',
    );
  });

  it('moves focus across bars with the arrow keys and selects with Enter', () => {
    const { track, onSelect } = renderEditor();
    const bars = screen.getAllByRole('button', { name: /，/ });

    fireEvent.keyDown(track, { key: 'ArrowDown' });
    expect(bars[1]).toHaveFocus();

    fireEvent.keyDown(track, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith({ eventId: 'event-2', phaseId: 'phase-2' });
  });

  it('keeps a read-only bar selectable but never drags it', () => {
    const { track, onSelect, onRangeChange } = renderEditor({ readOnly: true });
    const from = barPoint(0);

    drag(track, from, { x: from.x + yearWidth() * 2, y: from.y }, 4, barAt(0));

    expect(onSelect).toHaveBeenCalledWith({ eventId: 'event-1', phaseId: 'phase-1' });
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('follows the selected phase when its years are edited out of the window', () => {
    const noop = vi.fn();
    const tree = (startYear: number) => (
      <LifeEventTimelineEditor
        events={[event('event-2', 'Rent', [phase('phase-2', 'Phase 1', startYear, startYear)])]}
        readOnly={false}
        projectionStartYear={START}
        birthYear={1990}
        lifeExpectancy={90}
        retirementYear={2050}
        selection={{ eventId: 'event-2', phaseId: 'phase-2' }}
        revealYear={null}
        onSelect={noop}
        onCreate={noop}
        onGestureStart={noop}
        onRangeChange={noop}
      />
    );

    const { rerender } = render(tree(2030));
    // The window opens on the projection start and the bar is already in view.
    expect(screen.getByRole('button', { name: 'Pan 1 year back' })).toBeDisabled();

    rerender(tree(2050));

    expect(screen.getByRole('button', { name: 'Pan 1 year back' })).toBeEnabled();
  });
});
