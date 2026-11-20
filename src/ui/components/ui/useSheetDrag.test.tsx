import * as React from 'react';

import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetDrag } from './useSheetDrag';

const HEIGHT = 400;

const setReducedMotion = (matches: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const Harness: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const drag = useSheetDrag(surfaceRef, onDismiss);

  return (
    <div
      ref={surfaceRef}
      data-testid="surface"
      style={drag.offset === null ? undefined : { transform: `translateY(${drag.offset}px)` }}
    >
      <div data-testid="handle" {...drag.handlers} />
      <button type="button" data-testid="reset" onClick={drag.reset}>
        reset
      </button>
      <span data-testid="offset">{drag.offset === null ? 'none' : drag.offset}</span>
    </div>
  );
};

const setup = () => {
  const onDismiss = vi.fn();
  const view = render(<Harness onDismiss={onDismiss} />);
  const surface = view.getByTestId('surface');
  const handle = view.getByTestId('handle');
  surface.getBoundingClientRect = () =>
    ({
      height: HEIGHT,
      width: 400,
      top: 0,
      left: 0,
      bottom: HEIGHT,
      right: 400,
      x: 0,
      y: 0,
    }) as DOMRect;
  return { ...view, surface, handle, onDismiss };
};

/** happy-dom timestamps are wall-clock, so pin them to keep velocity readable. */
const pointer = (
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientY: number,
  timeStamp: number,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientY: { value: clientY },
    pointerId: { value: 1 },
    button: { value: 0 },
    timeStamp: { value: timeStamp },
  });
  act(() => void element.dispatchEvent(event));
};

/** happy-dom has no TransitionEvent constructor, so build one the listener reads. */
const transitionEnd = (target: HTMLElement, propertyName = 'transform') => {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  act(() => void target.dispatchEvent(event));
};

/** A 200px drag delivered over 100ms per step (~2 px/ms). */
const drag = (handle: HTMLElement, fromY: number, toY: number, at = 1000) => {
  pointer(handle, 'pointerdown', fromY, at);
  pointer(handle, 'pointermove', toY, at + 100);
};

describe('useSheetDrag', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dismisses once the sheet finishes travelling off-screen', () => {
    const { surface, handle, onDismiss, getByTestId } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointerup', 300, 1100);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(getByTestId('offset').textContent).toBe(String(HEIGHT));

    transitionEnd(surface);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // The transform stays at the resting value; clearing it would let Radix
    // replay its own slide from zero.
    expect(getByTestId('offset').textContent).toBe(String(HEIGHT));
  });

  it('ignores a transitionend bubbling up from a child layer', () => {
    const { surface, handle, onDismiss } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointerup', 300, 1100);

    transitionEnd(surface.firstElementChild as HTMLElement);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores a non-transform transitionend', () => {
    const { surface, handle, onDismiss } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointerup', 300, 1100);

    transitionEnd(surface, 'opacity');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('closes on the next frame under reduced motion', async () => {
    setReducedMotion(true);
    const { handle, onDismiss } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointerup', 300, 1100);

    await act(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('settles back below the threshold without closing', () => {
    const { handle, onDismiss, getByTestId } = setup();

    // 20px over 200ms keeps the release speed at 0.1 px/ms.
    pointer(handle, 'pointerdown', 100, 1000);
    pointer(handle, 'pointermove', 120, 1200);
    pointer(handle, 'pointerup', 120, 1400);

    expect(getByTestId('offset').textContent).toBe('0');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on distance alone when the release is slow', () => {
    const { handle, onDismiss } = setup();

    pointer(handle, 'pointerdown', 100, 1000);
    pointer(handle, 'pointermove', 300, 2000);
    pointer(handle, 'pointerup', 300, 2500);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('never dismisses an upward drag', () => {
    const { handle, onDismiss } = setup();

    pointer(handle, 'pointerdown', 200, 1000);
    pointer(handle, 'pointermove', 140, 1100);
    pointer(handle, 'pointerup', 140, 1200);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('never dismisses a cancelled pointer', () => {
    const { handle, onDismiss, getByTestId } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointercancel', 300, 1100);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(getByTestId('offset').textContent).toBe('0');
  });

  it('clears the leftover offset so a reopened sheet is not shoved down', () => {
    const { handle, getByTestId } = setup();

    drag(handle, 100, 300);
    pointer(handle, 'pointerup', 300, 1100);
    expect(getByTestId('offset').textContent).toBe(String(HEIGHT));

    fireEvent.click(getByTestId('reset'));
    expect(getByTestId('offset').textContent).toBe('none');
  });
});
